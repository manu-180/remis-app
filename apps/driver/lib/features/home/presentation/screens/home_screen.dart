import 'dart:async';

import 'package:battery_plus/battery_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:remis_design_system/remis_design_system.dart';
import 'package:remis_flutter_core/remis_flutter_core.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:remis_driver/core/providers/auth_providers.dart';
import 'package:remis_driver/features/ride/data/ride_model.dart';
import 'package:remis_driver/features/ride/presentation/providers/ride_controller.dart';
import 'package:remis_driver/features/ride/presentation/screens/ride_completed_screen.dart';
import 'package:remis_driver/features/ride/presentation/screens/ride_in_progress_screen.dart';
import 'package:remis_driver/features/ride/presentation/widgets/ride_offer_modal.dart';
import 'package:remis_driver/features/shift/data/location_service.dart';
import 'package:remis_driver/features/shift/presentation/providers/shift_controller.dart';
import 'package:remis_driver/shared/audio_service.dart';
import 'package:remis_driver/shared/widgets/driver_status_pill.dart';
import 'package:remis_driver/shared/widgets/r_toast.dart';

const _initialPosition = CameraPosition(
  target: LatLng(-36.6167, -64.2833),
  zoom: 13,
);

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final Battery _battery = Battery();
  int _batteryLevel = 100;
  Timer? _batteryTimer;
  bool _offerModalOpen = false;
  bool _mapReady = false;
  GoogleMapController? _mapController;

  @override
  void initState() {
    super.initState();
    DriverAudio.init();
    _loadBattery();
    _batteryTimer = Timer.periodic(
      const Duration(minutes: 2),
      (_) => _loadBattery(),
    );
    // Start listening for incoming offers when shift is active
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(rideControllerProvider.notifier).listenForOffers();
    });
  }

  @override
  void dispose() {
    _batteryTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadBattery() async {
    try {
      final level = await _battery.batteryLevel;
      if (mounted) setState(() => _batteryLevel = level);
    } catch (_) {}
  }

  void _showOfferModal(RideModel offer) {
    if (_offerModalOpen) return;
    _offerModalOpen = true;
    DriverAudio.play(SoundEffect.rideOffer);
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      isDismissible: false,
      enableDrag: false,
      builder: (_) => RideOfferModal(
        offer: offer,
        onAccept: () {
          Navigator.pop(context);
          _offerModalOpen = false;
          ref.read(rideControllerProvider.notifier).acceptOffer(offer.id);
          DriverAudio.play(SoundEffect.rideAccepted);
        },
        onReject: () {
          Navigator.pop(context);
          _offerModalOpen = false;
          ref.read(rideControllerProvider.notifier).rejectOffer(offer.id);
          DriverAudio.play(SoundEffect.rideOfferLost);
        },
        onExpired: () {
          if (mounted) Navigator.pop(context);
          _offerModalOpen = false;
          DriverAudio.play(SoundEffect.rideOfferLost);
        },
      ),
    ).whenComplete(() => _offerModalOpen = false);
  }

  @override
  Widget build(BuildContext context) {
    final shiftState = ref.watch(shiftControllerProvider);
    final rideState = ref.watch(rideControllerProvider);

    // React to ride state changes
    ref.listen<RideState>(rideControllerProvider, (prev, next) {
      if (next is RideStateIncomingOffer) {
        _showOfferModal(next.offer);
      }
      if (next is RideStateError) {
        showToast(
          context,
          RToastData(message: next.message, type: RToastType.error),
        );
      }
    });

    // Active ride screen overlay
    if (rideState is RideStateActive) {
      return RideInProgressScreen(
        ride: rideState.ride,
        onArrived: () {
          ref.read(rideControllerProvider.notifier).markArrived();
          DriverAudio.play(SoundEffect.arrived);
        },
        onStartTrip: () {
          ref.read(rideControllerProvider.notifier).startTrip();
          DriverAudio.play(SoundEffect.tripStarted);
        },
        onEndTrip: () {
          ref.read(rideControllerProvider.notifier).endTrip();
          DriverAudio.play(SoundEffect.tripEnded);
        },
        onOpenChat: () => context.push(
          '/chat/${rideState.ride.id}/${rideState.ride.passengerId}',
        ),
        onSOS: () => _triggerSOS(),
      );
    }

    if (rideState is RideStateCompleted) {
      return RideCompletedScreen(
        ride: rideState.ride,
        onDone: () {
          ref.read(rideControllerProvider.notifier).listenForOffers();
        },
      );
    }

    // Home / idle screen
    final isActive = shiftState is ShiftActive;
    final theme = Theme.of(context);
    final user = ref.watch(currentUserProvider);
    final displayName =
        user?.userMetadata?['full_name'] as String? ?? 'Conductor';

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: theme.brightness == Brightness.dark
            ? Brightness.light
            : Brightness.dark,
        systemNavigationBarColor: Colors.transparent,
      ),
      child: Scaffold(
        extendBodyBehindAppBar: true,
        appBar: _TranslucentAppBar(
          shiftState: shiftState,
          batteryLevel: _batteryLevel,
          onSOS: _triggerSOS,
          displayName: displayName,
          onAvatarTap: () => context.push('/settings'),
        ),
        body: Stack(
          children: [
            GoogleMap(
              initialCameraPosition: _initialPosition,
              myLocationEnabled: false,
              myLocationButtonEnabled: false,
              zoomControlsEnabled: false,
              mapToolbarEnabled: false,
              compassEnabled: false,
              onMapCreated: (controller) {
                _mapController = controller;
                setState(() => _mapReady = true);
              },
            ),
            MapLoadingPlaceholder(visible: !_mapReady),
            if (!isActive) _EmptyStateOverlay(),
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: _DriverBottomCard(
                shiftState: shiftState,
                isActive: isActive,
              ),
            ),
          ],
        ),
        floatingActionButton: Padding(
          padding: const EdgeInsets.only(bottom: 140),
          child: FloatingActionButton.small(
            onPressed: _goToMyLocation,
            backgroundColor: theme.colorScheme.surface,
            foregroundColor: theme.colorScheme.onSurface,
            elevation: 2,
            child: const Icon(Icons.my_location),
          ),
        ),
        floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      ),
    );
  }

  Future<void> _goToMyLocation() async {
    if (_mapController == null) return;
    try {
      final loc = await LocationService.getCurrentLocation();
      if (loc != null && mounted) {
        _mapController!.animateCamera(
          CameraUpdate.newCameraPosition(
            CameraPosition(
              target: LatLng(loc.coords.latitude, loc.coords.longitude),
              zoom: 16,
            ),
          ),
        );
      }
    } catch (_) {}
  }

  void _triggerSOS() {
    showDialog<void>(
      context: context,
      builder: (_) => const _SOSDialog(),
    );
  }
}

// ─── AppBar ─────────────────────────────────────────────────────────────────

String _initials(String name) {
  final parts = name.trim().split(RegExp(r'\s+'));
  if (parts.length >= 2) {
    return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
  }
  return name.isNotEmpty ? name[0].toUpperCase() : '?';
}

class _TranslucentAppBar extends StatelessWidget implements PreferredSizeWidget {
  const _TranslucentAppBar({
    required this.shiftState,
    required this.batteryLevel,
    required this.onSOS,
    required this.displayName,
    required this.onAvatarTap,
  });

  final ShiftState shiftState;
  final int batteryLevel;
  final VoidCallback onSOS;
  final String displayName;
  final VoidCallback onAvatarTap;

  @override
  Size get preferredSize => const Size.fromHeight(56);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isActive = shiftState is ShiftActive;

    return ClipRect(
      child: BackdropFilter(
        filter: ColorFilter.mode(
          theme.colorScheme.surface.withValues(alpha: 0.72),
          BlendMode.srcATop,
        ),
        child: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: Padding(
            padding: const EdgeInsets.only(left: 12),
            child: GestureDetector(
              onTap: onAvatarTap,
              child: Center(
                child: CircleAvatar(
                  radius: 18,
                  backgroundColor: kBrandPrimary.withValues(alpha: 0.12),
                  child: Text(
                    _initials(displayName),
                    style: interTight(
                      fontSize: RTextSize.xs,
                      fontWeight: FontWeight.w700,
                      color: kBrandPrimary,
                    ),
                  ),
                ),
              ),
            ),
          ),
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Hola, ${displayName.split(' ').first}',
                style: interTight(
                  fontSize: RTextSize.sm,
                  fontWeight: FontWeight.w600,
                  color: theme.colorScheme.onSurface,
                ),
              ),
              Text(
                isActive ? 'Turno activo' : 'Turno inactivo',
                style: inter(
                  fontSize: RTextSize.xs,
                  color: isActive ? kSuccess : theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
          actions: [
            if (batteryLevel < 20)
              _BatteryWarning(level: batteryLevel),
            IconButton(
              onPressed: onSOS,
              icon: const Icon(Icons.warning_amber_rounded),
              color: kDanger,
              tooltip: 'SOS',
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Battery Warning ─────────────────────────────────────────────────────────

class _BatteryWarning extends StatelessWidget {
  const _BatteryWarning({required this.level});
  final int level;

  @override
  Widget build(BuildContext context) {
    final isCritical = level < 10;
    return Padding(
      padding: const EdgeInsets.only(right: RSpacing.s4),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.battery_alert,
            size: 16,
            color: isCritical ? kDanger : kWarning,
          ),
          const SizedBox(width: 2),
          Text(
            '$level%',
            style: inter(
              fontSize: RTextSize.xs,
              fontWeight: FontWeight.w600,
              color: isCritical ? kDanger : kWarning,
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Empty state overlay ─────────────────────────────────────────────────────

class _EmptyStateOverlay extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: 80,
      left: RSpacing.s24,
      right: RSpacing.s24,
      child: Container(
        padding: const EdgeInsets.all(RSpacing.s20),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface.withValues(alpha: 0.92),
          borderRadius: BorderRadius.circular(RRadius.xl),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 12,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.directions_car_outlined, size: 40, color: kBrandAccent),
            const SizedBox(height: RSpacing.s8),
            Text(
              'Iniciá turno cuando estés listo',
              textAlign: TextAlign.center,
              style: interTight(
                fontSize: RTextSize.md,
                fontWeight: FontWeight.w600,
                color: Theme.of(context).colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: RSpacing.s4),
            Text(
              'Te avisamos cuando entre un pedido.',
              textAlign: TextAlign.center,
              style: inter(
                fontSize: RTextSize.sm,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      )
          .animate()
          .fadeIn(duration: 400.ms)
          .slideY(begin: -0.1, end: 0, duration: 400.ms, curve: Curves.easeOut),
    );
  }
}

// ─── Bottom card ─────────────────────────────────────────────────────────────

class _DriverBottomCard extends ConsumerWidget {
  const _DriverBottomCard({
    required this.shiftState,
    required this.isActive,
  });

  final ShiftState shiftState;
  final bool isActive;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isLoading = shiftState is ShiftLoading;
    final statusText = switch (shiftState) {
      ShiftActive(status: final s) => s,
      _ => DriverStatus.offline,
    };

    return Container(
      padding: EdgeInsets.fromLTRB(
        RSpacing.s20,
        RSpacing.s16,
        RSpacing.s20,
        RSpacing.s20 + MediaQuery.paddingOf(context).bottom,
      ),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(RRadius.xl),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 15,
            offset: const Offset(0, -3),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 44,
              height: 4,
              margin: const EdgeInsets.only(bottom: RSpacing.s12),
              decoration: BoxDecoration(
                color: theme.colorScheme.outlineVariant,
                borderRadius: BorderRadius.circular(RRadius.full),
              ),
            ),
          ),
          DriverStatusPill(status: statusText),
          const SizedBox(height: RSpacing.s4),
          Text(
            isActive
                ? 'En zona · esperando pedidos'
                : 'Iniciá tu turno para recibir pedidos',
            style: inter(
              fontSize: RTextSize.xs,
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          if (shiftState is ShiftError) ...[
            const SizedBox(height: RSpacing.s8),
            Text(
              (shiftState as ShiftError).message,
              style: inter(fontSize: RTextSize.xs, color: kDanger),
            ),
          ],
          const SizedBox(height: RSpacing.s16),
          SizedBox(
            width: double.infinity,
            height: 72,
            child: FilledButton(
              onPressed: isLoading
                  ? null
                  : () {
                      HapticFeedback.mediumImpact();
                      if (isActive) {
                        ref.read(shiftControllerProvider.notifier).endShift();
                      } else {
                        ref.read(shiftControllerProvider.notifier).startShift();
                        ref
                            .read(rideControllerProvider.notifier)
                            .listenForOffers();
                      }
                    },
              style: FilledButton.styleFrom(
                backgroundColor: isActive ? kNeutral200Light : kBrandAccent,
                foregroundColor: isActive ? kNeutral900Light : Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(RRadius.md),
                ),
                textStyle: inter(
                  fontSize: RTextSize.md,
                  fontWeight: FontWeight.w600,
                ),
              ),
              child: isLoading
                  ? SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        color: isActive ? kNeutral900Light : Colors.white,
                      ),
                    )
                  : Text(isActive ? 'Terminar turno' : 'Iniciar turno'),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── SOS Dialog ──────────────────────────────────────────────────────────────

class _SOSDialog extends StatefulWidget {
  const _SOSDialog();
  @override
  State<_SOSDialog> createState() => _SOSDialogState();
}

class _SOSDialogState extends State<_SOSDialog>
    with SingleTickerProviderStateMixin {
  late AnimationController _ring;
  Timer? _hapticTimer;
  bool _triggered = false;

  static const _holdDuration = Duration(milliseconds: 2500);

  @override
  void initState() {
    super.initState();
    _ring = AnimationController(vsync: this, duration: _holdDuration);
  }

  @override
  void dispose() {
    _ring.dispose();
    _hapticTimer?.cancel();
    super.dispose();
  }

  void _onHoldStart(LongPressStartDetails _) {
    _ring.forward();
    _hapticTimer = Timer.periodic(
      const Duration(milliseconds: 500),
      (_) => HapticFeedback.heavyImpact(),
    );
    _ring.addStatusListener((status) {
      if (status == AnimationStatus.completed) _completeSOS();
    });
  }

  void _onHoldEnd(LongPressEndDetails _) {
    if (_triggered) return;
    _ring.reset();
    _hapticTimer?.cancel();
    HapticFeedback.lightImpact();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('SOS cancelado')),
    );
  }

  Future<void> _completeSOS() async {
    if (_triggered) return;
    _triggered = true;
    _hapticTimer?.cancel();
    DriverAudio.play(SoundEffect.sosTriggered);
    Navigator.pop(context);

    try {
      final client = Supabase.instance.client;
      final uid = client.auth.currentUser!.id;

      String? locationWkt;
      try {
        final loc = await LocationService.getCurrentLocation();
        if (loc != null) {
          locationWkt =
              'SRID=4326;POINT(${loc.coords.longitude} ${loc.coords.latitude})';
        }
      } catch (_) {}

      await client.from('sos_events').insert({
        'triggered_by': uid,
        'triggered_role': 'driver',
        if (locationWkt != null) 'location': locationWkt,
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('SOS enviado. La central fue notificada.'),
            backgroundColor: kDanger,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error enviando SOS: $e'),
            backgroundColor: kDanger,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(
        'SOS de emergencia',
        style: interTight(
          fontSize: RTextSize.lg,
          fontWeight: FontWeight.w700,
          color: kDanger,
        ),
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Mantené presionado el botón para enviar una alerta de emergencia.',
            style: inter(fontSize: RTextSize.sm),
          ),
          const SizedBox(height: RSpacing.s24),
          AnimatedBuilder(
            animation: _ring,
            builder: (_, __) {
              final remaining =
                  ((_holdDuration.inSeconds) * (1 - _ring.value)).ceil();
              return GestureDetector(
                onLongPressStart: _onHoldStart,
                onLongPressEnd: _onHoldEnd,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    SizedBox(
                      width: 100,
                      height: 100,
                      child: CircularProgressIndicator(
                        value: _ring.value,
                        strokeWidth: 6,
                        backgroundColor: kDanger.withValues(alpha: 0.2),
                        valueColor:
                            const AlwaysStoppedAnimation<Color>(kDanger),
                      ),
                    ),
                    Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        color: kDanger,
                        shape: BoxShape.circle,
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        _ring.value > 0 ? '$remaining' : 'SOS',
                        style: interTight(
                          fontSize: RTextSize.xl,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(
            'Cancelar',
            style: inter(fontSize: RTextSize.sm),
          ),
        ),
      ],
    );
  }
}
