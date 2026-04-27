import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:remis_design_system/remis_design_system.dart';
import 'package:remis_flutter_core/remis_flutter_core.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _dotController;
  bool _showIndicator = false;

  @override
  void initState() {
    super.initState();
    _dotController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat();

    _navigate();
  }

  @override
  void dispose() {
    _dotController.dispose();
    super.dispose();
  }

  Future<void> _navigate() async {
    // Show dot indicator after 800ms if still loading
    await Future<void>.delayed(const Duration(milliseconds: 800));
    if (mounted) setState(() => _showIndicator = true);

    // Minimum splash duration = 600ms, max = 1500ms — already waited 800ms
    await Future<void>.delayed(const Duration(milliseconds: 400));

    if (!mounted) return;

    final isAuth = ref.read(isAuthenticatedProvider);
    context.go(isAuth ? '/home' : '/auth/login');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBrandPrimary,
      body: SafeArea(
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 240),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),
              Text(
                'Remís',
                style: interTight(
                  fontSize: RTextSize.xl3,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                  letterSpacing: -0.02 * RTextSize.xl3,
                ),
              ),
              const SizedBox(height: RSpacing.s8),
              Text(
                'Driver',
                style: inter(
                  fontSize: RTextSize.lg,
                  fontWeight: FontWeight.w400,
                  color: Colors.white.withValues(alpha: 0.7),
                  letterSpacing: 0.06 * RTextSize.lg,
                ),
              ),
              const Spacer(),
              AnimatedOpacity(
                opacity: _showIndicator ? 1.0 : 0.0,
                duration: const Duration(milliseconds: 300),
                child: _ThreeDotsIndicator(controller: _dotController),
              ),
              const SizedBox(height: RSpacing.s48),
            ],
          ),
        ),
      ),
    );
  }
}

class _ThreeDotsIndicator extends AnimatedWidget {
  const _ThreeDotsIndicator({required AnimationController controller})
      : super(listenable: controller);

  @override
  Widget build(BuildContext context) {
    final animation = listenable as AnimationController;
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(3, (i) {
        final delay = i / 3;
        final opacity = (((animation.value + delay) % 1.0) < 0.5) ? 0.9 : 0.3;
        return Container(
          margin: const EdgeInsets.symmetric(horizontal: RSpacing.s4),
          width: 6,
          height: 6,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: opacity),
            shape: BoxShape.circle,
          ),
        );
      }),
    );
  }
}
