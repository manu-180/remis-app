import 'package:disable_battery_optimization/disable_battery_optimization.dart';
import 'package:flutter/material.dart';
import 'package:remis_driver/features/onboarding/presentation/widgets/onboarding_scaffold.dart';

class StepBatteryOptimization extends StatelessWidget {
  const StepBatteryOptimization({super.key, required this.onNext});
  final VoidCallback onNext;

  Future<void> _disable(BuildContext context) async {
    await DisableBatteryOptimization.showDisableBatteryOptimizationSettings();
    if (context.mounted) onNext();
  }

  @override
  Widget build(BuildContext context) {
    return OnboardingScaffold(
      icon: Icons.battery_charging_full_rounded,
      title: 'Optimización de batería',
      body:
          'Desactivá la optimización para que la app no se cierre sola entre pedidos.',
      primaryLabel: 'Abrir ajustes de batería',
      onPrimary: () => _disable(context),
    );
  }
}
