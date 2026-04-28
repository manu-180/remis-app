import 'package:flutter/material.dart';
import 'package:remis_driver/features/onboarding/presentation/widgets/onboarding_scaffold.dart';

class StepWelcome extends StatelessWidget {
  const StepWelcome({super.key, required this.onNext});
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    return OnboardingScaffold(
      icon: Icons.directions_car_rounded,
      title: 'Bienvenido',
      body: 'Tenemos que configurar 7 cosas para que tu app funcione bien. Te lleva 5 minutos.',
      primaryLabel: 'Comenzar',
      onPrimary: onNext,
    );
  }
}
