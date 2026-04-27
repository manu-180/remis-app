import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:remis_design_system/remis_design_system.dart';
import 'package:remis_driver/features/ride/data/ride_model.dart';
import 'package:remis_driver/shared/widgets/r_premium_action_button.dart';

class RideInProgressScreen extends StatefulWidget {
  const RideInProgressScreen({
    super.key,
    required this.ride,
    required this.onArrived,
    required this.onStartTrip,
    required this.onEndTrip,
    required this.onOpenChat,
    required this.onSOS,
  });

  final RideModel ride;
  final VoidCallback onArrived;
  final VoidCallback onStartTrip;
  final VoidCallback onEndTrip;
  final VoidCallback onOpenChat;
  final VoidCallback onSOS;

  @override
  State<RideInProgressScreen> createState() => _RideInProgressScreenState();
}

class _RideInProgressScreenState extends State<RideInProgressScreen>
    with TickerProviderStateMixin {
  GoogleMapController? _mapController;
  Timer? _waitTimer;
  Duration _waitingDuration = Duration.zero;

  Timer? _tripTimer;
  Duration _tripDuration = Duration.zero;

  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    );
    _setupTimers(widget.ride);
  }

  @override
  void didUpdateWidget(RideInProgressScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.ride.status != widget.ride.status) {
      _cancelTimers();
      _setupTimers(widget.ride);
    }
  }

  void _setupTimers(RideModel ride) {
    if (ride.status == RideStatus.waitingPassenger) {
      final arrivedAt = ride.pickupArrivedAt ?? DateTime.now();
      _waitingDuration = DateTime.now().difference(arrivedAt);
      _waitTimer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (!mounted) return;
        setState(() => _waitingDuration += const Duration(seconds: 1));
      });
      _pulseController.repeat(reverse: true);
      Future.delayed(const Duration(seconds: 30), () {
        if (mounted) _pulseController.stop();
      });
    } else if (ride.status == RideStatus.onTrip) {
      final startedAt = ride.startedAt ?? DateTime.now();
      _tripDuration = DateTime.now().difference(startedAt);
      _tripTimer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (!mounted) return;
        setState(() => _tripDuration += const Duration(seconds: 1));
      });
    }
  }

  void _cancelTimers() {
    _waitTimer?.cancel();
    _waitTimer = null;
    _tripTimer?.cancel();
    _tripTimer = null;
    _waitingDuration = Duration.zero;
    _tripDuration = Duration.zero;
    _pulseController.stop();
    _pulseController.value = 0;
  }

  @override
  void dispose() {
    _waitTimer?.cancel();
    _tripTimer?.cancel();
    _pulseController.dispose();
    _mapController?.dispose();
    super.dispose();
  }

  String _formatDuration(Duration d) {
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  Set<Marker> _buildMarkers(RideModel ride) {
    final markers = <Marker>{};
    if (ride.pickupLocation != null) {
      markers.add(
        Marker(
          markerId: const MarkerId('pickup'),
          position: ride.pickupLocation!,
          icon: BitmapDescriptor.defaultMarkerWithHue(
              BitmapDescriptor.hueGreen),
          infoWindow: InfoWindow(title: ride.pickupAddress),
        ),
      );
    }
    if (ride.destLocation != null) {
      markers.add(
        Marker(
          markerId: const MarkerId('dest'),
          position: ride.destLocation!,
          icon: BitmapDescriptor.defaultMarkerWithHue(
              BitmapDescriptor.hueRed),
          infoWindow: InfoWindow(title: ride.destAddress),
        ),
      );
    }
    return markers;
  }

  CameraPosition _initialCamera(RideModel ride) {
    final target = ride.pickupLocation ??
        const LatLng(-38.7183, -62.2663);
    return CameraPosition(target: target, zoom: 14);
  }

  String _statusLabel(RideStatus status) => switch (status) {
        RideStatus.enRouteToPickup => 'En camino',
        RideStatus.waitingPassenger => 'Esperando',
        RideStatus.onTrip => 'En viaje',
        _ => '',
      };

  Color _statusColor(RideStatus status) => switch (status) {
        RideStatus.enRouteToPickup => kBrandPrimary,
        RideStatus.waitingPassenger => kBrandAccent,
        RideStatus.onTrip => kSuccess,
        _ => kNeutral900Light,
      };

  Widget _buildBottomSheetContent(RideModel ride) {
    return switch (ride.status) {
      RideStatus.enRouteToPickup => _EnRoutePanel(
          address: ride.pickupAddress,
          onArrived: widget.onArrived,
        ),
      RideStatus.waitingPassenger => _WaitingPanel(
          waitingDuration: _waitingDuration,
          pulseController: _pulseController,
          onStartTrip: widget.onStartTrip,
        ),
      RideStatus.onTrip => _OnTripPanel(
          address: ride.destAddress,
          tripDuration: _tripDuration,
          onEndTrip: widget.onEndTrip,
          formatDuration: _formatDuration,
        ),
      _ => const SizedBox.shrink(),
    };
  }

  @override
  Widget build(BuildContext context) {
    final ride = widget.ride;
    final statusColor = _statusColor(ride.status);

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.black.withValues(alpha: 0.35),
        elevation: 0,
        automaticallyImplyLeading: false,
        title: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: RSpacing.s12,
            vertical: RSpacing.s4,
          ),
          decoration: BoxDecoration(
            color: statusColor.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(RRadius.full),
            border: Border.all(color: statusColor, width: 1),
          ),
          child: Text(
            _statusLabel(ride.status),
            style: inter(
              fontSize: RTextSize.sm,
              fontWeight: FontWeight.w600,
              color: statusColor,
            ),
          ),
        ),
        actions: [
          IconButton(
            onPressed: widget.onSOS,
            icon: const Icon(
              Icons.warning_amber_rounded,
              color: kDanger,
              size: 28,
            ),
            tooltip: 'SOS',
          ),
          const SizedBox(width: RSpacing.s8),
        ],
      ),
      floatingActionButton: Padding(
        padding: const EdgeInsets.only(bottom: 280),
        child: FloatingActionButton(
          onPressed: widget.onOpenChat,
          backgroundColor: kBrandPrimary,
          foregroundColor: Colors.white,
          mini: true,
          tooltip: 'Chat',
          child: const Icon(Icons.chat_bubble_outline),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      body: Stack(
        children: [
          GoogleMap(
            initialCameraPosition: _initialCamera(ride),
            markers: _buildMarkers(ride),
            myLocationEnabled: true,
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
            mapToolbarEnabled: false,
            onMapCreated: (c) => _mapController = c,
          ),
          DraggableScrollableSheet(
            initialChildSize: 0.32,
            minChildSize: 0.22,
            maxChildSize: 0.55,
            builder: (context, scrollController) {
              return Container(
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.vertical(
                    top: Radius.circular(RRadius.xl),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Color(0x22000000),
                      blurRadius: 16,
                      offset: Offset(0, -4),
                    ),
                  ],
                ),
                child: SingleChildScrollView(
                  controller: scrollController,
                  child: Column(
                    children: [
                      const SizedBox(height: RSpacing.s8),
                      Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: kNeutral200Light,
                          borderRadius:
                              BorderRadius.circular(RRadius.full),
                        ),
                      ),
                      const SizedBox(height: RSpacing.s12),
                      _buildBottomSheetContent(ride),
                      const SizedBox(height: RSpacing.s24),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _EnRoutePanel extends StatelessWidget {
  const _EnRoutePanel({
    required this.address,
    required this.onArrived,
  });

  final String address;
  final VoidCallback onArrived;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: RSpacing.s24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'En camino al pasajero',
            style: interTight(
              fontSize: RTextSize.lg,
              fontWeight: FontWeight.w700,
              color: kNeutral900Light,
            ),
          ),
          const SizedBox(height: RSpacing.s8),
          Row(
            children: [
              const Icon(Icons.trip_origin,
                  size: 16, color: kBrandPrimary),
              const SizedBox(width: RSpacing.s8),
              Expanded(
                child: Text(
                  address,
                  style: inter(
                    fontSize: RTextSize.sm,
                    color: kNeutral900Light,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: RSpacing.s20),
          SizedBox(
            width: double.infinity,
            child: RPremiumActionButton(
              label: 'Llegué al pickup',
              icon: Icons.check_circle_outline,
              onPressed: onArrived,
            ),
          ),
        ],
      ),
    );
  }
}

class _WaitingPanel extends StatelessWidget {
  const _WaitingPanel({
    required this.waitingDuration,
    required this.pulseController,
    required this.onStartTrip,
  });

  final Duration waitingDuration;
  final AnimationController pulseController;
  final VoidCallback onStartTrip;

  String _fmt(Duration d) {
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: RSpacing.s24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Esperando pasajero',
            style: interTight(
              fontSize: RTextSize.lg,
              fontWeight: FontWeight.w700,
              color: kNeutral900Light,
            ),
          ),
          const SizedBox(height: RSpacing.s8),
          Row(
            children: [
              const Icon(Icons.access_time,
                  size: 16, color: kBrandAccent),
              const SizedBox(width: RSpacing.s8),
              Text(
                'Esperando hace ',
                style: inter(
                  fontSize: RTextSize.sm,
                  color: kNeutral900Light,
                ),
              ),
              Text(
                _fmt(waitingDuration),
                style: geistMono(
                  fontSize: RTextSize.sm,
                  fontWeight: FontWeight.w600,
                  color: kBrandAccent,
                ),
              ),
            ],
          ),
          const SizedBox(height: RSpacing.s20),
          SizedBox(
            width: double.infinity,
            child: AnimatedBuilder(
              animation: pulseController,
              builder: (context, child) {
                final scale = 1.0 +
                    (pulseController.value * 0.02);
                return Transform.scale(
                  scale: scale,
                  child: child,
                );
              },
              child: RPremiumActionButton(
                label: 'Iniciar viaje',
                icon: Icons.play_arrow_rounded,
                backgroundColor: kSuccess,
                onPressed: onStartTrip,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _OnTripPanel extends StatelessWidget {
  const _OnTripPanel({
    required this.address,
    required this.tripDuration,
    required this.onEndTrip,
    required this.formatDuration,
  });

  final String address;
  final Duration tripDuration;
  final VoidCallback onEndTrip;
  final String Function(Duration) formatDuration;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: RSpacing.s24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Viaje en curso',
            style: interTight(
              fontSize: RTextSize.lg,
              fontWeight: FontWeight.w700,
              color: kNeutral900Light,
            ),
          ),
          const SizedBox(height: RSpacing.s8),
          Row(
            children: [
              const Icon(Icons.location_on,
                  size: 16, color: kDanger),
              const SizedBox(width: RSpacing.s8),
              Expanded(
                child: Text(
                  address,
                  style: inter(
                    fontSize: RTextSize.sm,
                    color: kNeutral900Light,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: RSpacing.s4),
          Row(
            children: [
              const Icon(Icons.timer_outlined,
                  size: 16, color: kSuccess),
              const SizedBox(width: RSpacing.s8),
              Text(
                'Tiempo: ',
                style: inter(
                  fontSize: RTextSize.sm,
                  color: kNeutral900Light,
                ),
              ),
              Text(
                formatDuration(tripDuration),
                style: geistMono(
                  fontSize: RTextSize.sm,
                  fontWeight: FontWeight.w600,
                  color: kSuccess,
                ),
              ),
            ],
          ),
          const SizedBox(height: RSpacing.s20),
          SizedBox(
            width: double.infinity,
            child: RPremiumActionButton(
              label: 'Finalizar viaje',
              holdToConfirm: true,
              backgroundColor: kDanger,
              icon: Icons.flag_rounded,
              onPressed: onEndTrip,
            ),
          ),
        ],
      ),
    );
  }
}
