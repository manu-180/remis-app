import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:remis_flutter_core/flutter_core.dart';

import '../../../../core/mock_auth.dart';
import '../../../../core/routing/app_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../ride_request/data/models/destination_result.dart';
import '../../../ride_request/data/models/ride_model.dart';
import '../../../ride_request/data/models/route_result.dart';
import '../../../ride_request/data/ride_providers.dart';
import '../../../ride_request/data/ride_repository.dart';
import '../../../ride_request/presentation/widgets/destination_search_sheet.dart';
import '../../../ride_request/presentation/widgets/ride_confirmation_sheet.dart';
import '../widgets/map_style.dart';
import '../widgets/route_info_chip.dart';
import '../widgets/route_panel.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  GoogleMapController? _mapController;
  LatLng? _pickupLocation;
  bool _locationPermissionGranted = false;
  // Arranca en false: el mapa entra al árbol desde el primer frame.
  // Solo se pone true si detectamos que el permiso no fue otorgado aún.
  bool _showDisclosure = false;
  bool _loadingLocation = false;
  bool _mapReady = false;

  DestinationResult? _destination;
  RouteResult? _route;
  double? _fareArs;
  bool _confirmingDestination = false;

  static const _defaultCenter = LatLng(-36.6167, -64.2833); // Santa Rosa, La Pampa

  @override
  void initState() {
    super.initState();
    _checkExistingPermission();
    _checkActiveRide();
  }

  Future<void> _checkExistingPermission() async {
    final permission = await Geolocator.checkPermission();
    if (!mounted) return;
    if (permission == LocationPermission.always ||
        permission == LocationPermission.whileInUse) {
      setState(() => _locationPermissionGranted = true);
      _fetchCurrentLocation();
    } else {
      // No hay permiso previo: mostrar disclosure sobre el mapa ya cargando.
      setState(() => _showDisclosure = true);
    }
  }

  Future<void> _checkActiveRide() async {
    final activeRide = await ref.read(activeRideFutureProvider.future);
    if (!mounted) return;
    if (activeRide == null) return;
    // Navigate to the appropriate screen based on the ride's current status.
    switch (activeRide.status) {
      case RideStatus.requested:
        context.go(AppRoutes.waiting, extra: activeRide.id);
      case RideStatus.assigned:
      case RideStatus.enRouteToPickup:
      case RideStatus.waitingPassenger:
      case RideStatus.onTrip:
        context.go(AppRoutes.tracking, extra: activeRide);
      default:
        break; // Terminal status — stay on home
    }
  }

  Future<void> _fetchCurrentLocation() async {
    setState(() => _loadingLocation = true);

    // 1) Last-known position primero — instantáneo, evita pantalla muerta
    //    en la PRIMERA instalación mientras el GPS hace cold start.
    try {
      final last = await Geolocator.getLastKnownPosition();
      if (mounted && last != null && _pickupLocation == null) {
        final ll = LatLng(last.latitude, last.longitude);
        setState(() => _pickupLocation = ll);
        _mapController?.animateCamera(
          CameraUpdate.newLatLngZoom(ll, 15.5),
        );
      }
    } catch (_) {/* ignoramos: vamos a intentar getCurrentPosition */}

    // 2) Fix fresco con timeout (ver geolocator_provider.dart).
    final pos = await getCurrentPositionOrNull();
    if (!mounted) return;
    setState(() {
      _loadingLocation = false;
      if (pos != null) {
        _pickupLocation = LatLng(pos.latitude, pos.longitude);
      }
    });
    if (pos != null) {
      _mapController?.animateCamera(
        CameraUpdate.newLatLngZoom(
          LatLng(pos.latitude, pos.longitude),
          15.5,
        ),
      );
    }
  }

  Future<void> _onDisclosureContinue() async {
    setState(() => _showDisclosure = false);
    final result = await requestLocationPermission();
    if (!mounted) return;
    if (result == LocationPermissionResult.granted) {
      setState(() => _locationPermissionGranted = true);
      _fetchCurrentLocation();
    }
  }

  void _onDisclosureDismiss() => setState(() => _showDisclosure = false);

  void _openDestinationSearch() {
    final sheetController = DraggableScrollableController();
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      // Translucent barrier — the map stays visible behind the sheet.
      barrierColor: Colors.black.withValues(alpha: 0.18),
      backgroundColor: Colors.transparent,
      // Don't reserve space for status bar — the sheet handles its own padding
      // and we want the map readable above it.
      useSafeArea: false,
      builder: (sheetCtx) {
        return DraggableScrollableSheet(
          controller: sheetController,
          initialChildSize: 0.42,
          minChildSize: 0.42,
          maxChildSize: 0.92,
          snap: true,
          snapSizes: const [0.42, 0.92],
          expand: false,
          builder: (_, scrollController) {
            return DestinationSearchSheet(
              scrollController: scrollController,
              currentLocation: _pickupLocation,
              onRequestExpand: () {
                if (sheetController.isAttached &&
                    sheetController.size < 0.9) {
                  sheetController.animateTo(
                    0.92,
                    duration: const Duration(milliseconds: 220),
                    curve: Curves.easeOutCubic,
                  );
                }
              },
              onRequestCollapse: () {
                if (sheetController.isAttached &&
                    sheetController.size > 0.5) {
                  sheetController.animateTo(
                    0.42,
                    duration: const Duration(milliseconds: 220),
                    curve: Curves.easeOutCubic,
                  );
                }
              },
              onDestinationSelected: (result) {
                Navigator.of(sheetCtx).pop();
                _onDestinationSelected(result);
              },
            );
          },
        );
      },
    );
  }

  Future<void> _onDestinationSelected(DestinationResult dest) async {
    var pickup = _pickupLocation;

    // Primera instalación: el permiso recién se otorgó y getCurrentPosition
    // todavía no terminó. Antes se hacía `return` silencioso → el destino
    // nunca aparecía en el mapa, no había ruta ni tarifa, y solo cerrar y
    // reabrir lo arreglaba (porque ahí el GPS ya estaba caliente).
    if (pickup == null) {
      try {
        final last = await Geolocator.getLastKnownPosition();
        if (last != null) {
          pickup = LatLng(last.latitude, last.longitude);
          if (mounted) setState(() => _pickupLocation = pickup);
        }
      } catch (_) {/* sigue null → snackbar abajo */}
    }

    if (pickup == null) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'No pudimos detectar tu ubicación. Tocá el mapa para fijar el origen.',
          ),
        ),
      );
      return;
    }

    setState(() {
      _destination = dest;
      _route = null;
      _fareArs = null;
    });

    // Fetch route and fare in parallel.
    final routeFuture =
        ref.read(directionsServiceProvider).route(pickup, dest.location);
    final fareFuture = ref
        .read(rideRepositoryProvider)
        .estimateFare(pickup: pickup, dest: dest.location)
        .then<double?>((f) => f.estimatedAmountArs)
        .catchError((_) => null);

    try {
      final route = await routeFuture;
      if (!mounted) return;
      setState(() => _route = route);
      _fitCameraToRoute(pickup, dest.location);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No se pudo calcular la ruta')),
      );
    }

    final fare = await fareFuture;
    if (!mounted) return;
    setState(() => _fareArs = fare);
  }

  void _fitCameraToRoute(LatLng a, LatLng b) {
    final ctrl = _mapController;
    if (ctrl == null) return;
    final bounds = LatLngBounds(
      southwest: LatLng(
        a.latitude < b.latitude ? a.latitude : b.latitude,
        a.longitude < b.longitude ? a.longitude : b.longitude,
      ),
      northeast: LatLng(
        a.latitude > b.latitude ? a.latitude : b.latitude,
        a.longitude > b.longitude ? a.longitude : b.longitude,
      ),
    );
    // 80px padding so chip + panel don't overlap markers.
    ctrl.animateCamera(CameraUpdate.newLatLngBounds(bounds, 80));
  }

  void _clearDestination() {
    setState(() {
      _destination = null;
      _route = null;
      _fareArs = null;
    });
    if (_pickupLocation != null) {
      _mapController?.animateCamera(
        CameraUpdate.newLatLngZoom(_pickupLocation!, 15.5),
      );
    }
  }

  Future<void> _confirmDestination() async {
    final pickup = _pickupLocation;
    final dest = _destination;
    if (pickup == null || dest == null) return;

    setState(() => _confirmingDestination = true);

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => RideConfirmationSheet(
        pickup: pickup,
        dest: dest,
        pickupAddress: 'Mi ubicación',
        onRideCreated: (ride) {
          if (!mounted) return;
          context.go(AppRoutes.waiting, extra: ride.id);
        },
        onError: (message) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(message),
              backgroundColor: AppColors.danger,
              behavior: SnackBarBehavior.floating,
              duration: const Duration(seconds: 4),
            ),
          );
        },
      ),
    );

    if (mounted) {
      setState(() => _confirmingDestination = false);
    }
  }

  @override
  void dispose() {
    _mapController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final user = ref.watch(currentUserProvider);
    final displayName = user?.userMetadata?['full_name'] as String? ?? 'vos';

    return Scaffold(
      body: Stack(
        children: [
          // ── Fullscreen map ──
          GoogleMap(
            initialCameraPosition: CameraPosition(
              target: _pickupLocation ?? _defaultCenter,
              zoom: 14,
            ),
            myLocationEnabled: _locationPermissionGranted,
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
            mapToolbarEnabled: false,
            style: isDark ? MapStyles.dark : null,
            markers: {
              if (_pickupLocation != null)
                Marker(
                  markerId: const MarkerId('pickup'),
                  position: _pickupLocation!,
                  icon: BitmapDescriptor.defaultMarkerWithHue(
                    BitmapDescriptor.hueGreen,
                  ),
                  draggable: _destination == null,
                  onDragEnd: (pos) => setState(() => _pickupLocation = pos),
                ),
              if (_destination != null)
                Marker(
                  markerId: const MarkerId('destination'),
                  position: _destination!.location,
                  icon: BitmapDescriptor.defaultMarkerWithHue(
                    BitmapDescriptor.hueRed,
                  ),
                  infoWindow: InfoWindow(title: _destination!.label),
                ),
            },
            polylines: {
              if (_route != null)
                Polyline(
                  polylineId: const PolylineId('route'),
                  points: _route!.polyline,
                  color: Theme.of(context).colorScheme.primary,
                  width: 5,
                  startCap: Cap.roundCap,
                  endCap: Cap.roundCap,
                ),
            },
            onMapCreated: (ctrl) {
              _mapController = ctrl;
              setState(() => _mapReady = true);
            },
            onTap: (pos) => setState(() => _pickupLocation = pos),
          ),

          // ── Loading placeholder (se desvanece cuando el mapa está listo) ──
          MapLoadingPlaceholder(visible: !_mapReady),

          // ── Top bar (translucent, no blur per spec) ──
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              child: _TopBar(
                displayName: displayName,
                onHistoryTap: () => context.push(AppRoutes.history),
                onProfileTap: () => context.push(AppRoutes.settings),
              ),
            ),
          ),

          // ── Route info chip (fare · ETA · distance) ──
          if (_route != null)
            Positioned(
              top: 90,
              left: 0,
              right: 0,
              child: SafeArea(
                child: Center(
                  child: RouteInfoChip(
                    fareArs: _fareArs,
                    durationMinutes: _route!.durationMinutes,
                    distanceKm: _route!.distanceKm,
                  ),
                ),
              ),
            ),

          // ── Location CTA when permission denied ──
          if (!_locationPermissionGranted)
            Positioned(
              bottom: 200,
              left: 24,
              right: 24,
              child: _NoLocationBanner(
                onEnable: () => setState(() => _showDisclosure = true),
              ),
            ),

          // ── My location button ──
          if (_locationPermissionGranted)
            Positioned(
              right: 16,
              bottom: 200,
              child: FloatingActionButton.small(
                heroTag: 'my_location',
                backgroundColor: Theme.of(context).colorScheme.surface,
                onPressed: _fetchCurrentLocation,
                child: _loadingLocation
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Icon(
                        Icons.my_location,
                        color: Theme.of(context).colorScheme.primary,
                      ),
              ),
            ),

          // ── Bottom panel (collapsed / route-ready) ──
          Align(
            alignment: Alignment.bottomCenter,
            child: RoutePanel(
              pickupAddress: 'Mi ubicación',
              destinationLabel: _destination?.label,
              destinationAddress: _destination?.address,
              // Siempre abrimos el sheet — si todavía no hay pickup,
              // _onDestinationSelected reintenta con getLastKnownPosition
              // y muestra un snackbar accionable si tampoco se obtiene.
              onSearchTap: _openDestinationSearch,
              onClearDestination: _clearDestination,
              onConfirm: _confirmDestination,
              confirmLoading: _confirmingDestination,
            ),
          ),

          // ── Disclosure de ubicación como overlay (encima del mapa) ──
          // El mapa ya está cargando detrás; esto evita bloquear su init.
          if (_showDisclosure)
            LocationDisclosureScreen(
              onContinue: _onDisclosureContinue,
              onDismiss: _onDisclosureDismiss,
            ),
        ],
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({
    required this.displayName,
    required this.onHistoryTap,
    required this.onProfileTap,
  });

  final String displayName;
  final VoidCallback onHistoryTap;
  final VoidCallback onProfileTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        // Solid translucent — no blur (spec: GPU cost over dense map)
        color: (isDark ? AppColors.neutralD100 : Colors.white).withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 8,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          GestureDetector(
            onTap: onProfileTap,
            child: CircleAvatar(
              radius: 18,
              backgroundColor: AppColors.brandPrimary.withValues(alpha: 0.12),
              child: const Icon(
                Icons.person_outline,
                size: 20,
                color: AppColors.brandPrimary,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Hola, $displayName',
              style: Theme.of(context).textTheme.titleMedium,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          IconButton(
            onPressed: onHistoryTap,
            icon: const Icon(Icons.history),
            tooltip: 'Historial',
            constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
          ),
        ],
      ),
    );
  }
}

class _NoLocationBanner extends StatelessWidget {
  const _NoLocationBanner({required this.onEnable});

  final VoidCallback onEnable;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Activá tu ubicación para que sepamos desde dónde te buscamos.',
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: onEnable,
              child: const Text('Activar ubicación'),
            ),
          ],
        ),
      ),
    );
  }
}
