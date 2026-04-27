import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../data/models/ride_model.dart';
import '../../data/ride_providers.dart';
import '../../data/ride_repository.dart';
import '../../../../core/routing/app_router.dart';
import '../../../../core/theme/app_theme.dart';

class WaitingScreen extends ConsumerStatefulWidget {
  const WaitingScreen({super.key, required this.rideId});

  final String rideId;

  @override
  ConsumerState<WaitingScreen> createState() => _WaitingScreenState();
}

class _WaitingScreenState extends ConsumerState<WaitingScreen>
    with TickerProviderStateMixin {
  // ── Animation controllers ─────────────────────────────────────────────────
  late final AnimationController _ring1Controller;
  late final AnimationController _ring2Controller;
  late final AnimationController _ring3Controller;
  late final AnimationController _iconScaleController;

  late final Animation<double> _ring1Radius;
  late final Animation<double> _ring1Opacity;
  late final Animation<double> _ring2Radius;
  late final Animation<double> _ring2Opacity;
  late final Animation<double> _ring3Radius;
  late final Animation<double> _ring3Opacity;
  late final Animation<double> _iconScale;

  // ── State ─────────────────────────────────────────────────────────────────
  Timer? _timeoutTimer;
  bool _cancelling = false;

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  @override
  void initState() {
    super.initState();
    _setupAnimations();
    _startTimeoutTimer();
  }

  void _setupAnimations() {
    const ringPeriod = Duration(milliseconds: 2400);
    const stagger = Duration(milliseconds: 600);

    // Ring 1 — starts immediately
    _ring1Controller = AnimationController(vsync: this, duration: ringPeriod)
      ..repeat();

    // Ring 2 — starts after 600ms stagger (we delay by forward-ing to a fraction)
    _ring2Controller = AnimationController(vsync: this, duration: ringPeriod);
    _ring2Controller.forward(from: stagger.inMilliseconds / ringPeriod.inMilliseconds);
    _ring2Controller.addStatusListener((status) {
      if (status == AnimationStatus.completed && mounted) {
        _ring2Controller.repeat();
      }
    });

    // Ring 3 — starts after 1200ms stagger
    _ring3Controller = AnimationController(vsync: this, duration: ringPeriod);
    _ring3Controller.forward(from: (stagger.inMilliseconds * 2) / ringPeriod.inMilliseconds);
    _ring3Controller.addStatusListener((status) {
      if (status == AnimationStatus.completed && mounted) {
        _ring3Controller.repeat();
      }
    });

    // Radius: 40 → 80
    final radiusTween = Tween<double>(begin: 40.0, end: 80.0);
    // Opacity: 0.6 → 0.0
    final opacityTween = Tween<double>(begin: 0.6, end: 0.0);

    final easeOut = CurvedAnimation(parent: _ring1Controller, curve: Curves.easeOut);
    _ring1Radius = radiusTween.animate(easeOut);
    _ring1Opacity = opacityTween.animate(easeOut);

    final easeOut2 = CurvedAnimation(parent: _ring2Controller, curve: Curves.easeOut);
    _ring2Radius = radiusTween.animate(easeOut2);
    _ring2Opacity = opacityTween.animate(easeOut2);

    final easeOut3 = CurvedAnimation(parent: _ring3Controller, curve: Curves.easeOut);
    _ring3Radius = radiusTween.animate(easeOut3);
    _ring3Opacity = opacityTween.animate(easeOut3);

    // Icon scale: 0.95 → 1.05 → 0.95, 1200ms repeat
    _iconScaleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);

    _iconScale = Tween<double>(begin: 0.95, end: 1.05).animate(
      CurvedAnimation(parent: _iconScaleController, curve: Curves.easeInOut),
    );
  }

  void _startTimeoutTimer() {
    _timeoutTimer = Timer(const Duration(minutes: 5), () {
      if (!mounted) return;
      showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          title: const Text('Estamos tardando un poco'),
          content: const Text(
            'No encontramos un conductor disponible todavía. '
            'El despachante se va a comunicar con vos por teléfono.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Entendido'),
            ),
          ],
        ),
      );
    });
  }

  @override
  void dispose() {
    _timeoutTimer?.cancel();
    _ring1Controller.dispose();
    _ring2Controller.dispose();
    _ring3Controller.dispose();
    _iconScaleController.dispose();
    super.dispose();
  }

  // ── Cancel flow ───────────────────────────────────────────────────────────
  void _showCancelDialog() {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('¿Cancelar el pedido?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('No, seguir esperando'),
          ),
          TextButton(
            style: TextButton.styleFrom(
              foregroundColor: AppColors.danger,
            ),
            onPressed: () {
              Navigator.pop(ctx);
              _cancelRide();
            },
            child: const Text('Sí, cancelar'),
          ),
        ],
      ),
    );
  }

  Future<void> _cancelRide() async {
    setState(() => _cancelling = true);

    try {
      final repo = ref.read(rideRepositoryProvider);
      await repo.cancelRide(widget.rideId, 'passenger_cancelled_before_assign');
      if (!mounted) return;
      context.go(AppRoutes.home);
    } catch (e) {
      if (!mounted) return;
      setState(() => _cancelling = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('No se pudo cancelar el pedido: $e'),
          backgroundColor: AppColors.danger,
        ),
      );
    }
  }

  // ── Build ─────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    // Realtime navigation: when status leaves 'requested', go to tracking.
    ref.listen<AsyncValue<RideModel>>(
      activeRideStreamProvider(widget.rideId),
      (prev, next) {
        next.whenData((ride) {
          if (ride.status != RideStatus.requested) {
            context.go('/tracking', extra: ride);
          }
        });
      },
    );

    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // ── Cancel button row ───────────────────────────────────────
            Align(
              alignment: Alignment.topLeft,
              child: Padding(
                padding: const EdgeInsets.only(left: 8.0, top: 4.0),
                child: TextButton(
                  onPressed: _cancelling ? null : _showCancelDialog,
                  child: _cancelling
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text(
                          'Cancelar pedido',
                          style: TextStyle(color: AppColors.neutral500),
                        ),
                ),
              ),
            ),

            // ── Central animation + copy ────────────────────────────────
            Expanded(
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Pulsing rings + search icon
                    SizedBox(
                      width: 180,
                      height: 180,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          _PulsingRing(
                            radiusAnimation: _ring1Radius,
                            opacityAnimation: _ring1Opacity,
                          ),
                          _PulsingRing(
                            radiusAnimation: _ring2Radius,
                            opacityAnimation: _ring2Opacity,
                          ),
                          _PulsingRing(
                            radiusAnimation: _ring3Radius,
                            opacityAnimation: _ring3Opacity,
                          ),
                          // Search icon with scale animation
                          ScaleTransition(
                            scale: _iconScale,
                            child: Container(
                              width: 80,
                              height: 80,
                              decoration: BoxDecoration(
                                color: AppColors.brandPrimary.withValues(alpha: 0.08),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.search_rounded,
                                size: 40,
                                color: AppColors.brandPrimary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 32),

                    // Headline
                    Text(
                      'Buscando conductor',
                      style: textTheme.headlineMedium,
                      textAlign: TextAlign.center,
                    ),

                    const SizedBox(height: 16),

                    // Primary body copy
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 40.0),
                      child: Text(
                        'Estamos avisando a los choferes disponibles cerca tuyo.',
                        style: textTheme.bodyMedium?.copyWith(
                          color: AppColors.neutral500,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),

                    const SizedBox(height: 12),

                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 40.0),
                      child: Text(
                        'Esto puede tardar hasta 5 minutos.',
                        style: textTheme.bodyMedium?.copyWith(
                          color: AppColors.neutral500,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Fine-print copy
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 48.0),
                      child: Text(
                        'Si pasan 5 min y no asignamos, te llamamos por teléfono.',
                        style: textTheme.bodySmall?.copyWith(
                          color: AppColors.neutral400,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// A single animated ring that expands and fades out.
class _PulsingRing extends StatelessWidget {
  const _PulsingRing({
    required this.radiusAnimation,
    required this.opacityAnimation,
  });

  final Animation<double> radiusAnimation;
  final Animation<double> opacityAnimation;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: radiusAnimation,
      builder: (context, _) {
        final diameter = radiusAnimation.value * 2;
        return Opacity(
          opacity: opacityAnimation.value.clamp(0.0, 1.0),
          child: Container(
            width: diameter,
            height: diameter,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: AppColors.brandPrimary,
                width: 2.0,
              ),
            ),
          ),
        );
      },
    );
  }
}
