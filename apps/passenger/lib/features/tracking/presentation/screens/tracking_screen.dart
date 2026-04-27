import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../home/presentation/widgets/map_style.dart';
import '../../../ride_request/data/models/driver_info_model.dart';
import '../../../ride_request/data/models/ride_model.dart';
import '../../../ride_request/data/ride_providers.dart';
import '../../../ride_request/data/ride_repository.dart';
import '../../../../core/theme/app_theme.dart';

// ---------------------------------------------------------------------------
// Helper: Haversine ETA (minutes)
// ---------------------------------------------------------------------------
int _etaMinutes(LatLng driverPos, LatLng pickupPos) {
  const r = 6371.0;
  final lat1 = driverPos.latitude * (pi / 180);
  final lat2 = pickupPos.latitude * (pi / 180);
  final dLat = lat2 - lat1;
  final dLng =
      (pickupPos.longitude - driverPos.longitude) * (pi / 180);
  final a = sin(dLat / 2) * sin(dLat / 2) +
      cos(lat1) * cos(lat2) * sin(dLng / 2) * sin(dLng / 2);
  final c = 2 * atan2(sqrt(a), sqrt(1 - a));
  return (r * c / 18 * 60).ceil().clamp(1, 60);
}

LatLng _lerpLatLng(LatLng a, LatLng b, double t) => LatLng(
      a.latitude + (b.latitude - a.latitude) * t,
      a.longitude + (b.longitude - a.longitude) * t,
    );

// ---------------------------------------------------------------------------
// TrackingScreen
// ---------------------------------------------------------------------------
class TrackingScreen extends ConsumerStatefulWidget {
  const TrackingScreen({super.key, required this.initialRide});

  final RideModel initialRide;

  @override
  ConsumerState<TrackingScreen> createState() => _TrackingScreenState();
}

class _TrackingScreenState extends ConsumerState<TrackingScreen>
    with SingleTickerProviderStateMixin {
  // ── State ──────────────────────────────────────────────────────────────────
  late RideModel _currentRide;
  DriverInfoModel? _driverInfo;
  LatLng? _driverMarkerPos;
  bool _cancelling = false;
  bool _loadingShare = false;
  RideStatus? _lastStatus;

  // Marker animation
  AnimationController? _markerAnimCtrl;
  Animation<double>? _markerAnim;
  LatLng? _markerFrom;
  LatLng? _markerTo;

  GoogleMapController? _mapController;

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  @override
  void initState() {
    super.initState();
    _currentRide = widget.initialRide;
    _lastStatus = _currentRide.status;

    _markerAnimCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _markerAnim = CurvedAnimation(
      parent: _markerAnimCtrl!,
      curve: Curves.easeInOutCubic,
    );
    _markerAnim!.addListener(_onMarkerAnimTick);

    if (_currentRide.driverId != null) {
      _fetchDriverInfo(_currentRide.driverId!);
    }
  }

  @override
  void dispose() {
    _markerAnimCtrl?.dispose();
    _mapController?.dispose();
    super.dispose();
  }

  // ── Data ───────────────────────────────────────────────────────────────────
  Future<void> _fetchDriverInfo(String driverId) async {
    final info =
        await ref.read(rideRepositoryProvider).getDriverInfo(driverId);
    if (!mounted) return;
    setState(() {
      _driverInfo = info;
      if (info?.location != null && _driverMarkerPos == null) {
        _driverMarkerPos = info!.location;
      }
    });
  }

  // ── Marker animation ───────────────────────────────────────────────────────
  void _animateDriverMarker(LatLng newPos) {
    _markerFrom = _driverMarkerPos ?? newPos;
    _markerTo = newPos;
    _markerAnimCtrl!.forward(from: 0);
  }

  void _onMarkerAnimTick() {
    if (_markerFrom == null || _markerTo == null) return;
    setState(() {
      _driverMarkerPos =
          _lerpLatLng(_markerFrom!, _markerTo!, _markerAnim!.value);
    });
  }

  // ── Cancel ─────────────────────────────────────────────────────────────────
  bool get _canCancel =>
      _currentRide.status == RideStatus.assigned ||
      _currentRide.status == RideStatus.enRouteToPickup;

  bool get _cancelWarning {
    if (_currentRide.status == RideStatus.enRouteToPickup) return true;
    if (_currentRide.status == RideStatus.assigned) {
      final at = _currentRide.assignedAt;
      if (at == null) return false;
      return DateTime.now().difference(at).inMinutes >= 2;
    }
    return false;
  }

  Future<void> _handleCancel() async {
    HapticFeedback.mediumImpact();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancelar viaje'),
        content: Text(
          _cancelWarning
              ? 'Podría aplicarse un cargo de cancelación. ¿Confirmás?'
              : '¿Cancelás el viaje?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('No, volver'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.danger,
              foregroundColor: AppColors.neutral0,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Sí, cancelar'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _cancelling = true);
    try {
      await ref
          .read(rideRepositoryProvider)
          .cancelRide(_currentRide.id, 'passenger_cancelled_after_assign');
      if (!mounted) return;
      context.go('/home');
    } catch (e) {
      if (!mounted) return;
      HapticFeedback.heavyImpact();
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Error al cancelar: $e')));
    } finally {
      if (mounted) setState(() => _cancelling = false);
    }
  }

  // ── Share ──────────────────────────────────────────────────────────────────
  Future<void> _handleShare() async {
    setState(() => _loadingShare = true);
    try {
      final token = await ref
          .read(rideRepositoryProvider)
          .createSharedTrip(_currentRide.id);
      if (!mounted) return;
      _showShareSheet('https://remis.app/v/$token');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Error al compartir: $e')));
    } finally {
      if (mounted) setState(() => _loadingShare = false);
    }
  }

  void _showShareSheet(String url) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _ShareSheet(shareUrl: url),
    );
  }

  // ── Call ───────────────────────────────────────────────────────────────────
  Future<void> _callDriver() async {
    HapticFeedback.lightImpact();
    final number = _driverInfo?.mobileNumber;
    if (number == null || number.isEmpty) return;
    final uri = Uri.parse('tel:$number');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  // ── ETA ────────────────────────────────────────────────────────────────────
  int? get _eta {
    if (_driverMarkerPos == null) return null;
    if (_currentRide.status == RideStatus.enRouteToPickup ||
        _currentRide.status == RideStatus.assigned) {
      return _etaMinutes(_driverMarkerPos!, _currentRide.pickupLocation);
    }
    return null;
  }

  String _statusLine() {
    switch (_currentRide.status) {
      case RideStatus.assigned:
        return 'Tu remís está saliendo';
      case RideStatus.enRouteToPickup:
        return 'Tu remís está en camino';
      case RideStatus.waitingPassenger:
        final m = _driverInfo?.mobileNumber ?? '';
        return 'Tu remís está afuera · Móvil $m';
      case RideStatus.onTrip:
        return 'Estás en viaje';
      default:
        return '';
    }
  }

  // ── Markers ────────────────────────────────────────────────────────────────
  Set<Marker> _buildMarkers() {
    final markers = <Marker>{};
    markers.add(Marker(
      markerId: const MarkerId('pickup'),
      position: _currentRide.pickupLocation,
      icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
      infoWindow: InfoWindow(
          title: 'Punto de encuentro',
          snippet: _currentRide.pickupAddress),
    ));
    if (_currentRide.destLocation != null) {
      markers.add(Marker(
        markerId: const MarkerId('destination'),
        position: _currentRide.destLocation!,
        icon:
            BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange),
        infoWindow: InfoWindow(
            title: 'Destino', snippet: _currentRide.destAddress),
      ));
    }
    if (_driverMarkerPos != null) {
      markers.add(Marker(
        markerId: const MarkerId('driver'),
        position: _driverMarkerPos!,
        icon:
            BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
        infoWindow: InfoWindow(
          title: _driverInfo?.fullName ?? 'Conductor',
          snippet: _driverInfo?.plate,
        ),
        rotation: _driverInfo?.heading ?? 0,
        flat: true,
      ));
    }
    return markers;
  }

  // ── Listeners ──────────────────────────────────────────────────────────────
  void _setupListeners() {
    ref.listen<AsyncValue<RideModel>>(
      activeRideStreamProvider(_currentRide.id),
      (_, next) {
        next.whenData((ride) {
          if (!mounted) return;

          // Haptics on status transitions
          if (ride.status != _lastStatus) {
            if (ride.status == RideStatus.waitingPassenger) {
              HapticFeedback.mediumImpact();
            } else if (ride.status == RideStatus.onTrip) {
              HapticFeedback.lightImpact();
            }
            _lastStatus = ride.status;
          }

          setState(() => _currentRide = ride);
          if (ride.driverId != null && _driverInfo == null) {
            _fetchDriverInfo(ride.driverId!);
          }
          if (ride.status.isTerminal) {
            context.go('/trip-complete',
                extra: {'ride': ride, 'driver': _driverInfo});
          }
        });
      },
    );

    if (_currentRide.driverId != null) {
      ref.listen<AsyncValue<DriverInfoModel?>>(
        driverLocationStreamProvider(_currentRide.driverId!),
        (_, next) {
          next.whenData((loc) {
            if (!mounted || loc?.location == null) return;
            _animateDriverMarker(loc!.location!);
            if (_driverInfo != null) {
              setState(() {
                _driverInfo = _driverInfo!.copyWith(
                  location: loc.location,
                  heading: loc.heading,
                );
              });
            }
          });
        },
      );
    }
  }

  // ── Build ──────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    _setupListeners();

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      body: Stack(
        children: [
          // Full-screen map
          GoogleMap(
            initialCameraPosition: CameraPosition(
              target: _driverMarkerPos ?? _currentRide.pickupLocation,
              zoom: 15,
            ),
            markers: _buildMarkers(),
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
            mapToolbarEnabled: false,
            style: isDark ? MapStyles.dark : null,
            onMapCreated: (c) => _mapController = c,
          ),

          // Back button
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Material(
                color: colorScheme.surface.withValues(alpha: 0.9),
                shape: const CircleBorder(),
                elevation: 2,
                child: InkWell(
                  customBorder: const CircleBorder(),
                  onTap: () => context.go('/home'),
                  child: const Padding(
                    padding: EdgeInsets.all(10),
                    child: Icon(Icons.arrow_back),
                  ),
                ),
              ),
            ),
          ),

          // Draggable bottom sheet
          _TrackingBottomSheet(
            ride: _currentRide,
            driverInfo: _driverInfo,
            statusLine: _statusLine(),
            eta: _eta,
            canCancel: _canCancel,
            cancelling: _cancelling,
            loadingShare: _loadingShare,
            onCall: _callDriver,
            onShare: _handleShare,
            onCancel: _handleCancel,
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Draggable bottom sheet
// ---------------------------------------------------------------------------
class _TrackingBottomSheet extends StatelessWidget {
  const _TrackingBottomSheet({
    required this.ride,
    required this.driverInfo,
    required this.statusLine,
    required this.eta,
    required this.canCancel,
    required this.cancelling,
    required this.loadingShare,
    required this.onCall,
    required this.onShare,
    required this.onCancel,
  });

  final RideModel ride;
  final DriverInfoModel? driverInfo;
  final String statusLine;
  final int? eta;
  final bool canCancel;
  final bool cancelling;
  final bool loadingShare;
  final VoidCallback onCall;
  final VoidCallback onShare;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final surfaceBg =
        isDark ? AppColors.neutralD100 : AppColors.neutral0;
    final subtleColor =
        isDark ? AppColors.neutralD500 : AppColors.neutral500;

    final fullName = driverInfo?.fullName ?? 'Conductor';
    final initials = fullName
        .trim()
        .split(' ')
        .where((p) => p.isNotEmpty)
        .take(2)
        .map((p) => p[0].toUpperCase())
        .join();
    final vehicleLine = [
      if (driverInfo?.vehicleType != null) driverInfo!.vehicleType!,
      if (driverInfo?.plate != null) driverInfo!.plate!,
    ].join(' · ');

    return DraggableScrollableSheet(
      initialChildSize: 0.35,
      minChildSize: 0.22,
      maxChildSize: 0.75,
      snap: true,
      snapSizes: const [0.22, 0.35, 0.75],
      builder: (context, scrollController) => Container(
        decoration: BoxDecoration(
          color: surfaceBg,
          borderRadius:
              const BorderRadius.vertical(top: Radius.circular(20)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.14),
              blurRadius: 20,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SingleChildScrollView(
          controller: scrollController,
          child: Column(
            children: [
              // Drag handle
              Padding(
                padding: const EdgeInsets.only(top: 12, bottom: 8),
                child: Container(
                  width: 44,
                  height: 4,
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppColors.neutralD300
                        : AppColors.neutral300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              Padding(
                padding: EdgeInsets.fromLTRB(
                  20,
                  8,
                  20,
                  20 + MediaQuery.of(context).padding.bottom,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Driver row
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 26,
                          backgroundColor: AppColors.brandPrimary,
                          child: Text(
                            initials.isEmpty ? '?' : initials,
                            style: theme.textTheme.titleMedium?.copyWith(
                              color: AppColors.neutral0,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                fullName,
                                style: theme.textTheme.titleMedium,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              if (driverInfo?.mobileNumber.isNotEmpty ==
                                  true)
                                Text(
                                  'Móvil ${driverInfo!.mobileNumber}',
                                  style: theme.textTheme.bodySmall
                                      ?.copyWith(color: subtleColor),
                                ),
                              if (vehicleLine.isNotEmpty)
                                Text(
                                  vehicleLine,
                                  style: theme.textTheme.bodySmall
                                      ?.copyWith(color: subtleColor),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                            ],
                          ),
                        ),
                        if (driverInfo != null)
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Row(children: [
                                const Icon(Icons.star_rounded,
                                    size: 14,
                                    color: AppColors.brandAccent),
                                const SizedBox(width: 2),
                                Text(
                                  driverInfo!.rating.toStringAsFixed(1),
                                  style: theme.textTheme.bodySmall
                                      ?.copyWith(color: subtleColor),
                                ),
                              ]),
                            ],
                          ),
                      ],
                    ),

                    const SizedBox(height: 16),
                    Divider(
                        color: isDark
                            ? AppColors.neutralD300
                            : AppColors.neutral200),
                    const SizedBox(height: 14),

                    // ETA + status
                    if (eta != null) ...[
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'Llega en ',
                            style: theme.textTheme.bodyMedium
                                ?.copyWith(color: subtleColor),
                          ),
                          AnimatedSwitcher(
                            duration: const Duration(milliseconds: 500),
                            transitionBuilder: (child, anim) =>
                                FadeTransition(
                              opacity: anim,
                              child: SlideTransition(
                                position: Tween<Offset>(
                                  begin: const Offset(0, 0.3),
                                  end: Offset.zero,
                                ).animate(anim),
                                child: child,
                              ),
                            ),
                            child: Text(
                              '$eta min',
                              key: ValueKey(eta),
                              style: theme.textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.w700,
                                fontFeatures: const [
                                  FontFeature.tabularFigures()
                                ],
                                color: AppColors.brandAccent,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                    ],
                    if (statusLine.isNotEmpty)
                      Text(
                        statusLine,
                        style: theme.textTheme.bodyMedium
                            ?.copyWith(color: subtleColor),
                        textAlign: TextAlign.center,
                      ),

                    const SizedBox(height: 16),
                    Divider(
                        color: isDark
                            ? AppColors.neutralD300
                            : AppColors.neutral200),
                    const SizedBox(height: 14),

                    // Action buttons
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: onCall,
                            icon: const Icon(Icons.phone_outlined,
                                size: 18),
                            label: const Text('Llamar'),
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size(0, 46),
                              shape: RoundedRectangleBorder(
                                  borderRadius:
                                      BorderRadius.circular(10)),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: loadingShare ? null : onShare,
                            icon: loadingShare
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2),
                                  )
                                : const Icon(Icons.share_outlined,
                                    size: 18),
                            label: const Text('Compartir'),
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size(0, 46),
                              shape: RoundedRectangleBorder(
                                  borderRadius:
                                      BorderRadius.circular(10)),
                            ),
                          ),
                        ),
                      ],
                    ),

                    if (canCancel) ...[
                      const SizedBox(height: 10),
                      TextButton(
                        onPressed: cancelling ? null : onCancel,
                        style: TextButton.styleFrom(
                          foregroundColor: AppColors.danger,
                          minimumSize: const Size(0, 44),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10)),
                        ),
                        child: cancelling
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2),
                              )
                            : const Text('Cancelar viaje'),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Share bottom sheet
// ---------------------------------------------------------------------------
class _ShareSheet extends StatelessWidget {
  const _ShareSheet({required this.shareUrl});
  final String shareUrl;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;
    final whatsappUri = Uri.parse(
      'whatsapp://send?text=${Uri.encodeComponent('Seguí mi viaje en tiempo real: $shareUrl')}',
    );

    return Padding(
      padding: EdgeInsets.fromLTRB(
          20, 20, 20, 20 + MediaQuery.of(context).padding.bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: colorScheme.outline,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 20),
          Text('Compartir viaje', style: textTheme.headlineMedium),
          const SizedBox(height: 6),
          Text(
            'Enviá el link para que alguien siga tu viaje.',
            style: textTheme.bodyMedium
                ?.copyWith(color: colorScheme.onSurfaceVariant),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: colorScheme.outline),
            ),
            child: SelectableText(
              shareUrl,
              style: textTheme.bodySmall
                  ?.copyWith(fontFamily: 'monospace'),
            ),
          ),
          const SizedBox(height: 14),
          FilledButton.icon(
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: shareUrl));
              if (!context.mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                    content: Text('Link copiado al portapapeles')),
              );
            },
            icon: const Icon(Icons.copy_rounded, size: 18),
            label: const Text('Copiar link'),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: () async {
              if (await canLaunchUrl(whatsappUri)) {
                await launchUrl(whatsappUri,
                    mode: LaunchMode.externalApplication);
              } else {
                await Clipboard.setData(ClipboardData(text: shareUrl));
                if (!context.mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text(
                        'WhatsApp no disponible. Link copiado.'),
                  ),
                );
              }
            },
            icon:
                const Icon(Icons.chat_bubble_outline_rounded, size: 18),
            label: const Text('Enviar por WhatsApp'),
            style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xFF25D366),
              side: const BorderSide(color: Color(0xFF25D366)),
              minimumSize: const Size(0, 48),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ],
      ),
    );
  }
}
