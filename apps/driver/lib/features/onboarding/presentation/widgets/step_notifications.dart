import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:remis_driver/features/onboarding/presentation/widgets/onboarding_scaffold.dart';

class StepNotifications extends StatelessWidget {
  const StepNotifications({super.key, required this.onNext});
  final VoidCallback onNext;

  Future<void> _request(BuildContext context) async {
    await Permission.notification.request();
    if (context.mounted) onNext();
  }

  @override
  Widget build(BuildContext context) {
    return OnboardingScaffold(
      icon: Icons.notifications_outlined,
      title: 'Notificaciones',
      body: 'Recibirás los pedidos por acá. Sin notificaciones, podés perder viajes.',
      primaryLabel: 'Permitir notificaciones',
      onPrimary: () => _request(context),
    );
  }
}
