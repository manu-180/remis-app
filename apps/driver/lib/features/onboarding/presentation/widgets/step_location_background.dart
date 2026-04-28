import 'dart:io';

import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:remis_driver/features/onboarding/presentation/widgets/onboarding_scaffold.dart';

class StepLocationBackground extends StatefulWidget {
  const StepLocationBackground({super.key, required this.onNext});
  final VoidCallback onNext;

  @override
  State<StepLocationBackground> createState() => _State();
}

class _State extends State<StepLocationBackground> with WidgetsBindingObserver {
  bool _waitingReturn = false;

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
    if (state == AppLifecycleState.resumed && _waitingReturn) {
      _check();
    }
  }

  Future<void> _check() async {
    final status = await Permission.locationAlways.status;
    if (status.isGranted && mounted) {
      widget.onNext();
    } else if (mounted) {
      setState(() => _waitingReturn = true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Todavía no habilitaste la ubicación "todo el tiempo". Volvé a intentar.',
          ),
        ),
      );
    }
  }

  Future<void> _request() async {
    if (Platform.isAndroid) {
      setState(() => _waitingReturn = true);
      await openAppSettings();
    } else {
      final status = await Permission.locationAlways.request();
      if (status.isGranted && mounted) {
        widget.onNext();
      } else {
        setState(() => _waitingReturn = true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return OnboardingScaffold(
      icon: Icons.location_searching_rounded,
      title: 'Ubicación "todo el tiempo"',
      body: Platform.isAndroid
          ? 'En la pantalla que se abre, tocá "Permitir todo el tiempo". Esto es obligatorio para recibir pedidos con la app en segundo plano.'
          : 'Seleccioná "Siempre" cuando el sistema te pregunte.',
      primaryLabel: _waitingReturn ? 'Verificar' : 'Abrir ajustes',
      onPrimary: _waitingReturn ? _check : _request,
      warning: _waitingReturn
          ? 'Si no ves la opción, buscá "Permisos → Ubicación → Todo el tiempo".'
          : null,
    );
  }
}
