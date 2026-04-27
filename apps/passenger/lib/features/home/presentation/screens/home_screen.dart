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
import '../../../ride_request/data/ride_providers.dart';
import '../../../ride_request/presentation/screens/destination_search_screen.dart';
import '../../../ride_request/presentation/widgets/ride_confirmation_sheet.dart';
import '../widgets/home_bottom_sheet.dart';
import '../widgets/map_style.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  GoogleMapController? _mapController;
  LatLng? _pickupLocation;
  bool _locationPermissionGranted = false;
  bool _showDisclosure = true;
  bool _loadingLocation = false;

  static const _defaultCenter = LatLng(-36.6167, -64.2833); // Santa Rosa, La Pampa

  @override
  void initState() {
    super.initState();
    _checkExistingPermission();
    _checkActiveRide();
  }

  Future<void> _checkExistingPermission() async {
    final permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.always ||
        permission == LocationPermission.whileInUse) {
      setState(() {
        _showDisclosure = false;
        _locationPermissionGranted = true;
      });
      _fetchCurrentLocation();
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
    Navigator.push<DestinationResult>(
      context,
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => DestinationSearchScreen(
          onDestinationSelected: (result) {
            Navigator.pop(context); // close destination search
            _onDestinationSelected(result);
          },
        ),
      ),
    );
  }

  void _onDestinationSelected(DestinationResult dest) {
    final pickup = _pickupLocation;
    if (pickup == null) return;

    showModalBottomSheet<void>(
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
      ),
    );
  }

  @override
  void dispose() {
    _mapController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Show prominent disclosure BEFORE requesting OS permission
    if (_showDisclosure) {
      return LocationDisclosureScreen(
        onContinue: _onDisclosureContinue,
        onDismiss: _onDisclosureDismiss,
      );
    }

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
                    BitmapDescriptor.hueOrange,
                  ),
                  draggable: true,
                  onDragEnd: (pos) =>
                      setState(() => _pickupLocation = pos),
                ),
            },
            onMapCreated: (ctrl) => _mapController = ctrl,
            onTap: (pos) => setState(() => _pickupLocation = pos),
          ),

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

          // ── Bottom sheet (3 stops) ──
          HomeBottomSheet(
            pickupLocation: _pickupLocation,
            onSearchTap: _pickupLocation != null ? _openDestinationSearch : null,
            onDestinationSelected: (_) {}, // Legacy callback — unused now
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
