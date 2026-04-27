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
// Helper: naive Haversine ETA (minutes)
// ---------------------------------------------------------------------------
int _etaMinutes(LatLng driverPos, LatLng pickupPos) {
  const r = 6371.0;
  final lat1 = driverPos.latitude * (pi / 180);
  final lat2 = pickupPos.latitude * (pi / 180);
  final dLat = lat2 - lat1;
  final dLng = (pickupPos.longitude - driverPos.longitude) * (pi / 180);
  final a = sin(dLat / 2) * sin(dLat / 2) +
      cos(lat1) * cos(lat2) * sin(dLng / 2) * sin(dLng / 2);
  final c = 2 * atan2(sqrt(a), sqrt(1 - a));
  final distKm = r * c;
  return (distKm / 18 * 60).ceil().clamp(1, 60);
}

// ---------------------------------------------------------------------------
// Helper: linear interpolation between two LatLng values
// ---------------------------------------------------------------------------
LatLng _lerpLatLng(LatLng a, LatLng b, double t) {
  return LatLng(
    a.latitude + (b.latitude - a.latitude) * t,
    a.longitude + (b.longitude - a.longitude) * t,
  );
}

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

  // Marker animation
  AnimationController? _markerAnimCtrl;
  Animation<double>? _markerAnim;
  LatLng? _markerFrom;
  LatLng? _markerTo;

  // Map controller
  GoogleMapController? _mapController;

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  @override
  void initState() {
    super.initState();
    _currentRide = widget.initialRide;

    _markerAnimCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _markerAnim = CurvedAnimation(
      parent: _markerAnimCtrl!,
      curve: Curves.easeInOut,
    );
    _markerAnim!.addListener(_onMarkerAnimTick);

    // Load full driver info once if we already know the driver
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

  // ── Data fetching ──────────────────────────────────────────────────────────
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

  // ── Driver marker animation ────────────────────────────────────────────────
  void _animateDriverMarker(LatLng newPos) {
    final from = _driverMarkerPos ?? newPos;
    _markerFrom = from;
    _markerTo = newPos;
    _markerAnimCtrl!.forward(from: 0);
  }

  void _onMarkerAnimTick() {
    if (_markerFrom == null || _markerTo == null) return;
    final t = _markerAnim!.value;
    setState(() {
      _driverMarkerPos = _lerpLatLng(_markerFrom!, _markerTo!, t);
    });
  }

  // ── Cancel logic ───────────────────────────────────────────────────────────
  bool get _canCancel =>
      _currentRide.status == RideStatus.assigned ||
      _currentRide.status == RideStatus.enRouteToPickup;

  bool get _cancelWarning {
    if (_currentRide.status == RideStatus.enRouteToPickup) return true;
    if (_currentRide.status == RideStatus.assigned) {
      final assignedAt = _currentRide.assignedAt;
      if (assignedAt == null) return false;
      return DateTime.now().difference(assignedAt).inMinutes >= 2;
    }
    return false;
  }

  Future<void> _handleCancel() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancelar viaje'),
        content: Text(
          _cancelWarning
              ? 'Podría aplicarse un cargo de cancelación. ¿Confirmás la cancelación?'
              : '¿Confirmás la cancelación del viaje?',
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
      await ref.read(rideRepositoryProvider).cancelRide(
            _currentRide.id,
            'passenger_cancelled_after_assign',
          );
      if (!mounted) return;
      context.go('/home');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error al cancelar: $e')),
      );
    } finally {
      if (mounted) setState(() => _cancelling = false);
    }
  }

  // ── Share logic ────────────────────────────────────────────────────────────
  Future<void> _handleShare() async {
    setState(() => _loadingShare = true);
    try {
      final token =
          await ref.read(rideRepositoryProvider).createSharedTrip(_currentRide.id);
      if (!mounted) return;
      final url = 'https://remis.app/v/$token';
      _showShareSheet(url);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error al compartir: $e')),
      );
    } finally {
      if (mounted) setState(() => _loadingShare = false);
    }
  }

  void _showShareSheet(String url) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => _ShareSheet(shareUrl: url),
    );
  }

  // ── Phone call ─────────────────────────────────────────────────────────────
  Future<void> _callDriver() async {
    final number = _driverInfo?.mobileNumber;
    if (number == null || number.isEmpty) return;
    final uri = Uri.parse('tel:$number');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  // ── Status text ────────────────────────────────────────────────────────────
  String _statusText() {
    final driverPos = _driverMarkerPos;
    switch (_currentRide.status) {
      case RideStatus.assigned:
        return 'Tu remís está saliendo';
      case RideStatus.enRouteToPickup:
        if (driverPos != null) {
          final eta = _etaMinutes(driverPos, _currentRide.pickupLocation);
          return 'Tu remís llega en $eta min';
        }
        return 'Tu remís está en camino';
      case RideStatus.waitingPassenger:
        final mobile = _driverInfo?.mobileNumber ?? '';
        return 'Tu remís está afuera · Móvil $mobile';
      case RideStatus.onTrip:
        return 'Estás en viaje';
      default:
        return '';
    }
  }

  // ── Map markers ────────────────────────────────────────────────────────────
  Set<Marker> _buildMarkers() {
    final markers = <Marker>{};

    // Pickup marker (brand primary)
    markers.add(Marker(
      markerId: const MarkerId('pickup'),
      position: _currentRide.pickupLocation,
      icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
      infoWindow: InfoWindow(
        title: 'Punto de encuentro',
        snippet: _currentRide.pickupAddress,
      ),
    ));

    // Destination marker (brand accent / orange)
    if (_currentRide.destLocation != null) {
      markers.add(Marker(
        markerId: const MarkerId('destination'),
        position: _currentRide.destLocation!,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange),
        infoWindow: InfoWindow(
          title: 'Destino',
          snippet: _currentRide.destAddress,
        ),
      ));
    }

    // Driver marker (animating position)
    if (_driverMarkerPos != null) {
      markers.add(Marker(
        markerId: const MarkerId('driver'),
        position: _driverMarkerPos!,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
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

  // ── ref.listen setup ───────────────────────────────────────────────────────
  void _setupListeners() {
    // 1. Ride status realtime
    ref.listen<AsyncValue<RideModel>>(
      activeRideStreamProvider(_currentRide.id),
      (_, next) {
        next.whenData((ride) {
          if (!mounted) return;
          setState(() => _currentRide = ride);

          // If driverId just became available, fetch driver info
          if (ride.driverId != null && _driverInfo == null) {
            _fetchDriverInfo(ride.driverId!);
          }

          if (ride.status.isTerminal) {
            context.go(
              '/trip-complete',
              extra: {'ride': ride, 'driver': _driverInfo},
            );
          }
        });
      },
    );

    // 2. Driver location realtime — only when driverId is known
    if (_currentRide.driverId != null) {
      ref.listen<AsyncValue<DriverInfoModel?>>(
        driverLocationStreamProvider(_currentRide.driverId!),
        (_, next) {
          next.whenData((driverLoc) {
            if (!mounted) return;
            if (driverLoc?.location != null) {
              _animateDriverMarker(driverLoc!.location!);
              // Merge into _driverInfo to keep heading updated
              if (_driverInfo != null) {
                setState(() {
                  _driverInfo = _driverInfo!.copyWith(
                    location: driverLoc.location,
                    heading: driverLoc.heading,
                  );
                });
              }
            }
          });
        },
      );
    }
  }

  // ── Build ──────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    // Wire up listeners on every rebuild (Riverpod deduplicates by provider)
    _setupListeners();

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final colorScheme = Theme.of(context).colorScheme;

    // Initial camera position centred on pickup
    final initialCameraPos = CameraPosition(
      target: _driverMarkerPos ?? _currentRide.pickupLocation,
      zoom: 15,
    );

    return Scaffold(
      body: Stack(
        children: [
          // ── Full-screen map ──────────────────────────────────────────────
          GoogleMap(
            initialCameraPosition: initialCameraPos,
            markers: _buildMarkers(),
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
            mapToolbarEnabled: false,
            style: isDark ? MapStyles.dark : null,
            onMapCreated: (controller) {
              _mapController = controller;
            },
          ),

          // ── Back button top-left ─────────────────────────────────────────
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

          // ── Bottom panel ─────────────────────────────────────────────────
          Align(
            alignment: Alignment.bottomCenter,
            child: _BottomPanel(
              ride: _currentRide,
              driverInfo: _driverInfo,
              statusText: _statusText(),
              canCancel: _canCancel,
              cancelling: _cancelling,
              loadingShare: _loadingShare,
              onCall: _callDriver,
              onShare: _handleShare,
              onCancel: _handleCancel,
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Bottom panel widget
// ---------------------------------------------------------------------------
class _BottomPanel extends StatelessWidget {
  const _BottomPanel({
    required this.ride,
    required this.driverInfo,
    required this.statusText,
    required this.canCancel,
    required this.cancelling,
    required this.loadingShare,
    required this.onCall,
    required this.onShare,
    required this.onCancel,
  });

  final RideModel ride;
  final DriverInfoModel? driverInfo;
  final String statusText;
  final bool canCancel;
  final bool cancelling;
  final bool loadingShare;
  final VoidCallback onCall;
  final VoidCallback onShare;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final surfaceColor = isDark ? AppColors.neutralD100 : AppColors.neutral0;
    final subtleColor =
        isDark ? AppColors.neutralD500 : AppColors.neutral500;

    // Driver name display
    final fullName = driverInfo?.fullName ?? 'Conductor';
    final initials = fullName
        .trim()
        .split(' ')
        .where((p) => p.isNotEmpty)
        .take(2)
        .map((p) => p[0].toUpperCase())
        .join();

    // Vehicle line
    final vehicleLine = [
      if (driverInfo?.vehicleType != null) driverInfo!.vehicleType!,
      if (driverInfo?.plate != null) driverInfo!.plate!,
    ].join(' · ');

    // Header line: name + mobile number
    final driverLine = [
      fullName,
      if (driverInfo?.mobileNumber.isNotEmpty == true)
        'Móvil ${driverInfo!.mobileNumber}',
    ].join(' · ');

    return Container(
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.12),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      padding: EdgeInsets.fromLTRB(
        20,
        20,
        20,
        20 + MediaQuery.of(context).padding.bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Driver info row
          Row(
            children: [
              // Avatar with initials
              CircleAvatar(
                radius: 28,
                backgroundColor: AppColors.brandPrimary,
                child: Text(
                  initials.isEmpty ? '?' : initials,
                  style: textTheme.titleMedium?.copyWith(
                    color: AppColors.neutral0,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(width: 14),
              // Name + vehicle
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      driverLine,
                      style: textTheme.titleMedium,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (vehicleLine.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        vehicleLine,
                        style: textTheme.bodySmall?.copyWith(color: subtleColor),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    // Star rating
                    if (driverInfo != null) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(Icons.star_rounded,
                              size: 14, color: AppColors.brandAccent),
                          const SizedBox(width: 2),
                          Text(
                            driverInfo!.rating.toStringAsFixed(1),
                            style:
                                textTheme.bodySmall?.copyWith(color: subtleColor),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Status text
          if (statusText.isNotEmpty)
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                statusText,
                style: textTheme.bodyMedium?.copyWith(
                  color: colorScheme.onPrimaryContainer,
                  fontWeight: FontWeight.w500,
                ),
                textAlign: TextAlign.center,
              ),
            ),

          const SizedBox(height: 16),

          // Action buttons row: call + share
          Row(
            children: [
              // Call button
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: onCall,
                  icon: const Icon(Icons.phone_outlined, size: 18),
                  label: const Text('Llamar'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(0, 46),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              // Share button
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: loadingShare ? null : onShare,
                  icon: loadingShare
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.share_outlined, size: 18),
                  label: const Text('Compartir'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(0, 46),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),
            ],
          ),

          // Cancel button (only for assigned + enRouteToPickup)
          if (canCancel) ...[
            const SizedBox(height: 10),
            TextButton(
              onPressed: cancelling ? null : onCancel,
              style: TextButton.styleFrom(
                foregroundColor: AppColors.danger,
                minimumSize: const Size(0, 44),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: cancelling
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Cancelar viaje'),
            ),
          ],
        ],
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

    final whatsappMsg =
        'Seguí mi viaje en tiempo real: $shareUrl';
    final whatsappUri = Uri.parse(
      'whatsapp://send?text=${Uri.encodeComponent(whatsappMsg)}',
    );

    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        20,
        20,
        20 + MediaQuery.of(context).padding.bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Handle bar
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

          Text(
            'Compartir viaje',
            style: textTheme.headlineMedium,
          ),
          const SizedBox(height: 8),
          Text(
            'Enviá el link para que alguien siga tu viaje en tiempo real.',
            style: textTheme.bodyMedium?.copyWith(
              color: colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 16),

          // URL display box
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: colorScheme.outline),
            ),
            child: SelectableText(
              shareUrl,
              style: textTheme.bodySmall?.copyWith(
                fontFamily: 'monospace',
                color: colorScheme.onSurface,
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Copy link button
          FilledButton.icon(
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: shareUrl));
              if (!context.mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Link copiado al portapapeles')),
              );
            },
            icon: const Icon(Icons.copy_rounded, size: 18),
            label: const Text('Copiar link'),
          ),
          const SizedBox(height: 10),

          // WhatsApp button
          OutlinedButton.icon(
            onPressed: () async {
              if (await canLaunchUrl(whatsappUri)) {
                await launchUrl(whatsappUri,
                    mode: LaunchMode.externalApplication);
              } else {
                // Fallback: copy to clipboard
                await Clipboard.setData(ClipboardData(text: shareUrl));
                if (!context.mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text(
                      'WhatsApp no disponible. Link copiado al portapapeles.',
                    ),
                  ),
                );
              }
            },
            icon: const Icon(Icons.chat_bubble_outline_rounded, size: 18),
            label: const Text('Enviar por WhatsApp'),
            style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xFF25D366), // WhatsApp green
              side: const BorderSide(color: Color(0xFF25D366)),
              minimumSize: const Size(0, 48),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
