import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:remis_driver/features/onboarding/presentation/widgets/step_welcome.dart';
import 'package:remis_driver/features/onboarding/presentation/widgets/step_location_foreground.dart';
import 'package:remis_driver/features/onboarding/presentation/widgets/step_notifications.dart';
import 'package:remis_driver/features/onboarding/presentation/widgets/step_location_background.dart';
import 'package:remis_driver/features/onboarding/presentation/widgets/step_battery_optimization.dart';
import 'package:remis_driver/features/onboarding/presentation/widgets/step_oem_specific.dart';
import 'package:remis_driver/features/onboarding/presentation/widgets/step_functional_test.dart';
import 'package:remis_driver/features/onboarding/presentation/widgets/step_reminders.dart';

const _kOnboardingKey = 'onboarding_completed';

class OnboardingFlowScreen extends StatefulWidget {
  const OnboardingFlowScreen({super.key});

  @override
  State<OnboardingFlowScreen> createState() => _OnboardingFlowScreenState();
}

class _OnboardingFlowScreenState extends State<OnboardingFlowScreen> {
  final _controller = PageController();
  int _current = 0;

  void _next() {
    if (_current < 7) {
      _controller.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  Future<void> _complete() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_kOnboardingKey, true);
    if (mounted) context.go('/home');
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: Row(
                children: List.generate(8, (i) {
                  return Expanded(
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      height: 4,
                      margin: const EdgeInsets.symmetric(horizontal: 2),
                      decoration: BoxDecoration(
                        color: i <= _current
                            ? Theme.of(context).colorScheme.primary
                            : Theme.of(context).colorScheme.outlineVariant,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  );
                }),
              ),
            ),
          ),
          Expanded(
            child: PageView(
              controller: _controller,
              physics: const NeverScrollableScrollPhysics(),
              onPageChanged: (i) => setState(() => _current = i),
              children: [
                StepWelcome(onNext: _next),
                StepLocationForeground(onNext: _next),
                StepNotifications(onNext: _next),
                StepLocationBackground(onNext: _next),
                StepBatteryOptimization(onNext: _next),
                StepOemSpecific(onNext: _next),
                StepFunctionalTest(onNext: _next),
                StepReminders(onComplete: _complete),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
