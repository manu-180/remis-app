import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:remis_driver/features/onboarding/presentation/widgets/onboarding_scaffold.dart';

class StepLocationForeground extends StatefulWidget {
  const StepLocationForeground({super.key, required this.onNext});
  final VoidCallback onNext;

  @override
  State<StepLocationForeground> createState() => _State();
}

class _State extends State<StepLocationForeground> with WidgetsBindingObserver {
  bool _denied = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _denied) {
      _check();
    }
  }

  Future<void> _check() async {
    final status = await Permission.location.status;
    if (status.isGranted && mounted) widget.onNext();
  }

  Future<void> _request() async {
    final status = await Permission.location.request();
    if (status.isGranted) {
      widget.onNext();
    } else {
      setState(() => _denied = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return OnboardingScaffold(
      icon: Icons.location_on_outlined,
      title: 'Permiso de ubicación',
      body: 'Necesitamos saber dónde estás para enviarte pedidos cercanos.',
      primaryLabel: _denied ? 'Abrir ajustes' : 'Permitir ubicación',
      onPrimary: _denied ? () => openAppSettings() : _request,
      warning: _denied
          ? 'Habilitá el permiso de ubicación en Ajustes para continuar.'
          : null,
    );
  }
}
