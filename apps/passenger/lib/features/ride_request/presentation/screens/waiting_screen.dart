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
  // ── Pulse ring animations ─────────────────────────────────────────────────
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

  // ── Drag-to-cancel ────────────────────────────────────────────────────────
  late final AnimationController _springCtrl;
  double _dragOffset = 0;
  double _springStart = 0;
  bool _isSpringBack = false;

  // ── State ─────────────────────────────────────────────────────────────────
  Timer? _timeoutTimer;
  Timer? _copyChangeTimer;
  bool _cancelling = false;
  bool _showWarmCopy = false;

  static const double _cancelThresholdPx = 90;
  static const double _cancelThresholdVel = 600;
  static const double _maxDragPx = 160;

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

    _ring2Controller = AnimationController(vsync: this, duration: ringPeriod);
    _ring2Controller.forward(
        from: stagger.inMilliseconds / ringPeriod.inMilliseconds);
    _ring2Controller.addStatusListener((s) {
      if (s == AnimationStatus.completed && mounted) _ring2Controller.repeat();
    });

    _ring3Controller = AnimationController(vsync: this, duration: ringPeriod);
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

    _springCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 380),
    );
  }

  void _startTimers() {
    _copyChangeTimer = Timer(const Duration(seconds: 90), () {
      if (!mounted) return;
      setState(() => _showWarmCopy = true);
    });

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
    _springCtrl.dispose();
    super.dispose();
  }

  // ── Drag gesture ──────────────────────────────────────────────────────────

  void _onDragUpdate(DragUpdateDetails d) {
    if (_cancelling) return;
    final delta = d.primaryDelta ?? 0;
    if (delta > 0 || _dragOffset > 0) {
      _springCtrl.stop();
      setState(() {
        // Rubber-band: resistance increases as offset grows
        final raw = (_dragOffset + delta).clamp(0.0, _maxDragPx);
        _dragOffset = raw;
        _isSpringBack = false;
      });
    }
  }

  void _onDragEnd(DragEndDetails d) {
    final vel = d.primaryVelocity ?? 0;
    if (_dragOffset >= _cancelThresholdPx || vel >= _cancelThresholdVel) {
      setState(() {
        _dragOffset = 0;
        _isSpringBack = false;
      });
      HapticFeedback.mediumImpact();
      _showCancelDialog();
    } else {
      _startSpringBack();
    }
  }

  void _startSpringBack() {
    if (_dragOffset == 0) return;
    _springStart = _dragOffset;
    setState(() {
      _dragOffset = 0;
      _isSpringBack = true;
    });
    _springCtrl.forward(from: 0).then((_) {
      if (mounted) setState(() => _isSpringBack = false);
    });
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
            style: TextButton.styleFrom(foregroundColor: AppColors.danger),
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
      HapticFeedback.mediumImpact();
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
    final subtleColor = isDark ? AppColors.neutralD500 : AppColors.neutral500;
    final handleColor = isDark ? AppColors.neutralD400 : AppColors.neutral300;

    return Scaffold(
      body: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onVerticalDragUpdate: _onDragUpdate,
        onVerticalDragEnd: _onDragEnd,
        child: AnimatedBuilder(
          animation: _springCtrl,
          builder: (context, child) {
            // During spring-back, tween from springStart → 0
            final springOffset = _isSpringBack
                ? Tween<double>(begin: _springStart, end: 0).animate(
                    CurvedAnimation(
                        parent: _springCtrl, curve: Curves.easeOutCubic),
                  ).value
                : _dragOffset;

            // Rubber-band display: apply √ compression so it feels physical
            final displayOffset = springOffset <= 0
                ? 0.0
                : springOffset * (1 - springOffset / (_maxDragPx * 2.8));

            // Progress toward cancel threshold [0..1]
            final dragProgress =
                (springOffset / _cancelThresholdPx).clamp(0.0, 1.0);

            return Transform.translate(
              offset: Offset(0, displayOffset),
              child: _buildBody(
                textTheme: textTheme,
                isDark: isDark,
                subtleColor: subtleColor,
                handleColor: handleColor,
                dragProgress: dragProgress,
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildBody({
    required TextTheme textTheme,
    required bool isDark,
    required Color subtleColor,
    required Color handleColor,
    required double dragProgress,
  }) {
    return SafeArea(
      child: Column(
        children: [
          // ── Drag handle area ────────────────────────────────────────────
          _DragHandleArea(
            dragProgress: dragProgress,
            handleColor: handleColor,
            textTheme: textTheme,
          ),

          // ── Central animation + copy ────────────────────────────────────
          Expanded(
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
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
                      padding: const EdgeInsets.symmetric(horizontal: 40.0),
                      child: Text(
                        _showWarmCopy
                            ? 'Tardamos más de lo normal. Aguantá un toque — el despachante ya está en eso.'
                            : 'Estamos avisando a los choferes disponibles cerca tuyo.',
                        style:
                            textTheme.bodyMedium?.copyWith(color: subtleColor),
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

          // ── Bottom: progress + cancel button ────────────────────────────
          Padding(
            padding: EdgeInsets.fromLTRB(
                24, 0, 24, 20 + MediaQuery.of(context).padding.bottom),
            child: Column(
              children: [
                LinearProgressIndicator(
                  backgroundColor:
                      isDark ? AppColors.neutralD300 : AppColors.neutral200,
                  valueColor: const AlwaysStoppedAnimation<Color>(
                      AppColors.brandPrimary),
                  borderRadius: BorderRadius.circular(4),
                  minHeight: 3,
                ),
                const SizedBox(height: 20),
                _CancelButton(
                  cancelling: _cancelling,
                  onPressed: _cancelling ? null : _showCancelDialog,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Drag handle area ──────────────────────────────────────────────────────────

class _DragHandleArea extends StatelessWidget {
  const _DragHandleArea({
    required this.dragProgress,
    required this.handleColor,
    required this.textTheme,
  });

  final double dragProgress;
  final Color handleColor;
  final TextTheme textTheme;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 14, bottom: 4),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Pill handle
          AnimatedContainer(
            duration: const Duration(milliseconds: 120),
            width: dragProgress > 0 ? 48 : 36,
            height: 4,
            decoration: BoxDecoration(
              color: Color.lerp(handleColor, AppColors.danger, dragProgress),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          // Hint text — fades in as drag progresses
          SizedBox(
            height: 22,
            child: Opacity(
              opacity: dragProgress.clamp(0.0, 1.0),
              child: Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(
                  dragProgress >= 1.0
                      ? 'Soltá para cancelar'
                      : 'Deslizá para cancelar',
                  style: textTheme.labelSmall?.copyWith(
                    color: AppColors.danger,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.2,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Cancel button ─────────────────────────────────────────────────────────────

class _CancelButton extends StatelessWidget {
  const _CancelButton({
    required this.cancelling,
    required this.onPressed,
  });

  final bool cancelling;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: OutlinedButton(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.danger,
          disabledForegroundColor: AppColors.danger.withValues(alpha: 0.5),
          side: BorderSide(
            color: cancelling
                ? AppColors.danger.withValues(alpha: 0.4)
                : AppColors.danger,
            width: 1.5,
          ),
          shape: const StadiumBorder(),
          padding: const EdgeInsets.symmetric(horizontal: 20),
        ),
        onPressed: onPressed,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (cancelling)
              const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: AppColors.danger,
                ),
              )
            else
              const Icon(Icons.close_rounded, size: 20),
            const SizedBox(width: 8),
            Text(
              cancelling ? 'Cancelando...' : 'Cancelar pedido',
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.1,
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
