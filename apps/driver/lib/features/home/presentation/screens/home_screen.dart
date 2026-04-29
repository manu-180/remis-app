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
              myLocationEnabled: true,
              myLocationButtonEnabled: false,
              zoomControlsEnabled: false,
              mapToolbarEnabled: false,
              compassEnabled: false,
              onMapCreated: (controller) {
                _mapController = controller;
                setState(() => _mapReady = true);
                _goToMyLocation();
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
      final permResult = await requestLocationPermission();
      if (!mounted) return;
      if (permResult == LocationPermissionResult.deniedForever) {
        showToast(
          context,
          RToastData(
            message: 'Habilitá la ubicación en Ajustes del teléfono',
            type: RToastType.error,
          ),
        );
        return;
      }
      if (permResult == LocationPermissionResult.denied) {
        showToast(
          context,
          RToastData(
            message: 'Se necesitan permisos de ubicación',
            type: RToastType.error,
          ),
        );
        return;
      }

      LatLng? target;

      final bgLoc = await LocationService.getCurrentLocation();
      if (bgLoc != null) {
        target = LatLng(bgLoc.coords.latitude, bgLoc.coords.longitude);
      } else {
        final pos = await getCurrentPositionOrNull();
        if (pos != null) {
          target = LatLng(pos.latitude, pos.longitude);
        }
      }

      if (!mounted) return;
      if (target != null) {
        _mapController!.animateCamera(
          CameraUpdate.newCameraPosition(
            CameraPosition(target: target, zoom: 16),
          ),
        );
      } else {
        showToast(
          context,
          RToastData(
            message: 'No se pudo obtener tu ubicación',
            type: RToastType.error,
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        showToast(
          context,
          RToastData(
            message: 'No se pudo obtener tu ubicación',
            type: RToastType.error,
          ),
        );
      }
    }
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
            Padding(
              padding: const EdgeInsets.only(right: RSpacing.s8),
              child: GestureDetector(
                onTap: onSOS,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: RSpacing.s6,
                  ),
                  decoration: BoxDecoration(
                    color: kDanger,
                    borderRadius: BorderRadius.circular(RRadius.full),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.shield, color: Colors.white, size: 13),
                      const SizedBox(width: RSpacing.s4),
                      Text(
                        'SOS',
                        style: interTight(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.5,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
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
    with TickerProviderStateMixin {
  late AnimationController _ring;
  late AnimationController _pulse1;
  late AnimationController _pulse2;
  late AnimationController _pulse3;
  Timer? _hapticTimer;
  bool _triggered = false;
  bool _isHolding = false;

  final List<DateTime> _tapTimestamps = [];
  static const _requiredTaps = 5;
  static const _tapWindow = Duration(milliseconds: 1500);
  static const _holdDuration = Duration(milliseconds: 2500);

  @override
  void initState() {
    super.initState();
    _ring = AnimationController(vsync: this, duration: _holdDuration);
    _ring.addStatusListener((status) {
      if (status == AnimationStatus.completed) _completeSOS();
    });
    _pulse1 = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat();
    _pulse2 = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    );
    _pulse3 = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    );
    Future.delayed(const Duration(milliseconds: 667), () {
      if (mounted) _pulse2.repeat();
    });
    Future.delayed(const Duration(milliseconds: 1333), () {
      if (mounted) _pulse3.repeat();
    });
  }

  @override
  void dispose() {
    _ring.dispose();
    _pulse1.dispose();
    _pulse2.dispose();
    _pulse3.dispose();
    _hapticTimer?.cancel();
    super.dispose();
  }

  void _onHoldStart(LongPressStartDetails _) {
    if (_triggered) return;
    setState(() => _isHolding = true);
    _ring.forward();
    _hapticTimer = Timer.periodic(
      const Duration(milliseconds: 500),
      (_) => HapticFeedback.heavyImpact(),
    );
  }

  void _onHoldEnd(LongPressEndDetails _) {
    if (_triggered) return;
    setState(() => _isHolding = false);
    _ring.reset();
    _hapticTimer?.cancel();
    HapticFeedback.lightImpact();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('SOS cancelado')),
    );
  }

  void _onTap() {
    if (_triggered) return;
    HapticFeedback.mediumImpact();
    final now = DateTime.now();
    _tapTimestamps.removeWhere((t) => now.difference(t) > _tapWindow);
    _tapTimestamps.add(now);
    setState(() {});
    if (_tapTimestamps.length >= _requiredTaps) {
      _completeSOS();
    }
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

  Widget _buildPulseRing(AnimationController controller) {
    return AnimatedBuilder(
      animation: controller,
      builder: (_, __) {
        final t = controller.value;
        final size = 112.0 + (80.0 * t);
        final opacity = (1.0 - t) * 0.30;
        return Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(
              color: kDanger.withValues(alpha: opacity),
              width: 1.5,
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48),
      child: Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: const Color(0xFF0D0D0D),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: kDanger.withValues(alpha: 0.22),
          ),
          boxShadow: [
            BoxShadow(
              color: kDanger.withValues(alpha: 0.15),
              blurRadius: 48,
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Gradient accent strip at top
            Container(
              height: 3,
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF7A0000), kDanger, Color(0xFFFF6060)],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 28),
              child: Column(
                children: [
                  // Header row
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(7),
                        decoration: BoxDecoration(
                          color: kDanger.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: kDanger.withValues(alpha: 0.20),
                          ),
                        ),
                        child: const Icon(
                          Icons.shield_outlined,
                          color: kDanger,
                          size: 15,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        'EMERGENCIA',
                        style: interTight(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 2.0,
                          color: kDanger,
                        ),
                      ),
                      const Spacer(),
                      GestureDetector(
                        onTap: () => Navigator.pop(context),
                        child: Container(
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            color: const Color(0xFF1C1C1C),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: const Color(0xFF2A2A2A),
                            ),
                          ),
                          child: const Icon(
                            Icons.close,
                            color: Color(0xFF888888),
                            size: 14,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Container(height: 1, color: const Color(0xFF1C1C1C)),
                  const SizedBox(height: 28),

                  // SOS button with pulsing rings
                  AnimatedBuilder(
                    animation: _ring,
                    builder: (context, _) {
                      final remaining =
                          (_holdDuration.inSeconds * (1 - _ring.value))
                              .ceil();
                      return GestureDetector(
                        onLongPressStart: _onHoldStart,
                        onLongPressEnd: _onHoldEnd,
                        onTap: _onTap,
                        child: SizedBox(
                          width: 200,
                          height: 200,
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              _buildPulseRing(_pulse1),
                              _buildPulseRing(_pulse2),
                              _buildPulseRing(_pulse3),
                              // Hold progress ring
                              SizedBox(
                                width: 130,
                                height: 130,
                                child: CircularProgressIndicator(
                                  value: _ring.value,
                                  strokeWidth: 3,
                                  backgroundColor:
                                      Colors.white.withValues(alpha: 0.07),
                                  valueColor:
                                      const AlwaysStoppedAnimation<Color>(
                                          kDanger),
                                  strokeCap: StrokeCap.round,
                                ),
                              ),
                              // Main circle
                              AnimatedContainer(
                                duration: const Duration(milliseconds: 150),
                                width: 114,
                                height: 114,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  gradient: RadialGradient(
                                    center: const Alignment(-0.3, -0.5),
                                    radius: 1.1,
                                    colors: _isHolding
                                        ? [
                                            const Color(0xFFFF3333),
                                            const Color(0xFFAA0000),
                                          ]
                                        : [
                                            const Color(0xFFDD2222),
                                            const Color(0xFF800000),
                                          ],
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: kDanger.withValues(
                                          alpha: _isHolding ? 0.65 : 0.35),
                                      blurRadius: _isHolding ? 36 : 20,
                                      spreadRadius: _isHolding ? 6 : 0,
                                    ),
                                  ],
                                  border: Border.all(
                                    color:
                                        Colors.white.withValues(alpha: 0.15),
                                    width: 1.5,
                                  ),
                                ),
                                alignment: Alignment.center,
                                child: _ring.value > 0
                                    ? Text(
                                        '$remaining',
                                        style: interTight(
                                          fontSize: RTextSize.xl2,
                                          fontWeight: FontWeight.w900,
                                          color: Colors.white,
                                        ),
                                      )
                                    : Column(
                                        mainAxisAlignment:
                                            MainAxisAlignment.center,
                                        children: [
                                          Text(
                                            'SOS',
                                            style: interTight(
                                              fontSize: 30,
                                              fontWeight: FontWeight.w900,
                                              color: Colors.white,
                                              letterSpacing: 4,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Container(
                                            width: 28,
                                            height: 2,
                                            decoration: BoxDecoration(
                                              color: Colors.white
                                                  .withValues(alpha: 0.30),
                                              borderRadius:
                                                  BorderRadius.circular(1),
                                            ),
                                          ),
                                        ],
                                      ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),

                  const SizedBox(height: 20),

                  // Tap progress dots
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(_requiredTaps, (i) {
                      final filled = i < _tapTimestamps.length;
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 120),
                        width: filled ? 10 : 6,
                        height: filled ? 10 : 6,
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: filled
                              ? kDanger
                              : Colors.white.withValues(alpha: 0.12),
                          boxShadow: filled
                              ? [
                                  BoxShadow(
                                    color: kDanger.withValues(alpha: 0.5),
                                    blurRadius: 6,
                                  ),
                                ]
                              : null,
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: 12),

                  Text(
                    'Toca 5 veces rápido  ·  o mantené presionado',
                    style: inter(
                      fontSize: RTextSize.xs,
                      color: const Color(0xFF555555),
                      letterSpacing: 0.2,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
