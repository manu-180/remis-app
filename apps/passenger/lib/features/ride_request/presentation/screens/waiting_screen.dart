import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
  Timer? _copyChangeTimer;
  bool _cancelling = false;
  bool _showWarmCopy = false; // changed copy after 90s

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  @override
  void initState() {
    super.initState();
    _setupAnimations();
    _startTimers();
  }

  void _setupAnimations() {
    const ringPeriod = Duration(milliseconds: 2400);
    const stagger = Duration(milliseconds: 600);

    _ring1Controller = AnimationController(vsync: this, duration: ringPeriod)
      ..repeat();

    _ring2Controller =
        AnimationController(vsync: this, duration: ringPeriod);
    _ring2Controller.forward(
        from: stagger.inMilliseconds / ringPeriod.inMilliseconds);
    _ring2Controller.addStatusListener((s) {
      if (s == AnimationStatus.completed && mounted) _ring2Controller.repeat();
    });

    _ring3Controller =
        AnimationController(vsync: this, duration: ringPeriod);
    _ring3Controller.forward(
        from: (stagger.inMilliseconds * 2) / ringPeriod.inMilliseconds);
    _ring3Controller.addStatusListener((s) {
      if (s == AnimationStatus.completed && mounted) _ring3Controller.repeat();
    });

    final radiusTween = Tween<double>(begin: 40.0, end: 80.0);
    final opacityTween = Tween<double>(begin: 0.6, end: 0.0);

    _ring1Radius = radiusTween.animate(
        CurvedAnimation(parent: _ring1Controller, curve: Curves.easeOut));
    _ring1Opacity = opacityTween.animate(
        CurvedAnimation(parent: _ring1Controller, curve: Curves.easeOut));
    _ring2Radius = radiusTween.animate(
        CurvedAnimation(parent: _ring2Controller, curve: Curves.easeOut));
    _ring2Opacity = opacityTween.animate(
        CurvedAnimation(parent: _ring2Controller, curve: Curves.easeOut));
    _ring3Radius = radiusTween.animate(
        CurvedAnimation(parent: _ring3Controller, curve: Curves.easeOut));
    _ring3Opacity = opacityTween.animate(
        CurvedAnimation(parent: _ring3Controller, curve: Curves.easeOut));

    _iconScaleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    _iconScale = Tween<double>(begin: 0.95, end: 1.05).animate(
      CurvedAnimation(parent: _iconScaleController, curve: Curves.easeInOut),
    );
  }

  void _startTimers() {
    // 90s: change copy to warm reassurance
    _copyChangeTimer = Timer(const Duration(seconds: 90), () {
      if (!mounted) return;
      setState(() => _showWarmCopy = true);
    });

    // 5min: show timeout dialog
    _timeoutTimer = Timer(const Duration(minutes: 5), () {
      if (!mounted) return;
      showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          title: const Text('Estamos tardando un poco'),
          content: const Text(
            'No encontramos conductor disponible todavía. '
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
    _copyChangeTimer?.cancel();
    _ring1Controller.dispose();
    _ring2Controller.dispose();
    _ring3Controller.dispose();
    _iconScaleController.dispose();
    super.dispose();
  }

  // ── Cancel ────────────────────────────────────────────────────────────────
  void _showCancelDialog() {
    HapticFeedback.mediumImpact();
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
            style:
                TextButton.styleFrom(foregroundColor: AppColors.danger),
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
      await ref
          .read(rideRepositoryProvider)
          .cancelRide(widget.rideId, 'passenger_cancelled_before_assign');
      if (!mounted) return;
      context.go(AppRoutes.home);
    } catch (e) {
      if (!mounted) return;
      setState(() => _cancelling = false);
      HapticFeedback.heavyImpact();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('No se pudo cancelar: $e'),
          backgroundColor: AppColors.danger,
        ),
      );
    }
  }

  // ── Build ─────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    ref.listen<AsyncValue<RideModel>>(
      activeRideStreamProvider(widget.rideId),
      (_, next) {
        next.whenData((ride) {
          if (ride.status != RideStatus.requested) {
            HapticFeedback.mediumImpact();
            context.go('/tracking', extra: ride);
          }
        });
      },
    );

    final textTheme = Theme.of(context).textTheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final subtleColor =
        isDark ? AppColors.neutralD500 : AppColors.neutral500;

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Top row: cancel link
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
                      : Text('Cancelar pedido',
                          style: TextStyle(color: subtleColor)),
                ),
              ),
            ),

            // Central animation + copy
            Expanded(
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Pulsing rings + icon
                    SizedBox(
                      width: 180,
                      height: 180,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          _PulsingRing(
                              radiusAnimation: _ring1Radius,
                              opacityAnimation: _ring1Opacity),
                          _PulsingRing(
                              radiusAnimation: _ring2Radius,
                              opacityAnimation: _ring2Opacity),
                          _PulsingRing(
                              radiusAnimation: _ring3Radius,
                              opacityAnimation: _ring3Opacity),
                          ScaleTransition(
                            scale: _iconScale,
                            child: Container(
                              width: 80,
                              height: 80,
                              decoration: BoxDecoration(
                                color: AppColors.brandPrimary
                                    .withValues(alpha: 0.08),
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

                    Text(
                      'Buscando un conductor cerca tuyo',
                      style: textTheme.headlineMedium,
                      textAlign: TextAlign.center,
                    ),

                    const SizedBox(height: 16),

                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 500),
                      child: Padding(
                        key: ValueKey(_showWarmCopy),
                        padding:
                            const EdgeInsets.symmetric(horizontal: 40.0),
                        child: Text(
                          _showWarmCopy
                              ? 'Tardamos más de lo normal. Aguantá un toque — el despachante ya está en eso.'
                              : 'Estamos avisando a los choferes disponibles cerca tuyo.',
                          style: textTheme.bodyMedium?.copyWith(
                              color: subtleColor),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),

                    if (!_showWarmCopy) ...[
                      const SizedBox(height: 10),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 48),
                        child: Text(
                          'Esto puede tardar hasta 5 minutos.',
                          style: textTheme.bodySmall?.copyWith(
                              color: isDark
                                  ? AppColors.neutralD400
                                  : AppColors.neutral400),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),

            // Progress bar + bottom area
            Padding(
              padding: EdgeInsets.fromLTRB(
                  24, 0, 24, 16 + MediaQuery.of(context).padding.bottom),
              child: Column(
                children: [
                  LinearProgressIndicator(
                    backgroundColor: isDark
                        ? AppColors.neutralD300
                        : AppColors.neutral200,
                    valueColor: const AlwaysStoppedAnimation<Color>(
                        AppColors.brandPrimary),
                    borderRadius: BorderRadius.circular(4),
                    minHeight: 3,
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

// ── Pulsing ring ──────────────────────────────────────────────────────────────

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
      builder: (_, __) => Opacity(
        opacity: opacityAnimation.value.clamp(0.0, 1.0),
        child: Container(
          width: radiusAnimation.value * 2,
          height: radiusAnimation.value * 2,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(
              color: AppColors.brandPrimary,
              width: 2.0,
            ),
          ),
        ),
      ),
    );
  }
}
