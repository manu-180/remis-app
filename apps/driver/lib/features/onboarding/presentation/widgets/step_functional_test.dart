import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_background_geolocation/flutter_background_geolocation.dart' as bg;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:remis_driver/features/onboarding/presentation/widgets/onboarding_scaffold.dart';
import 'package:remis_driver/features/shift/data/location_service.dart';

enum _TestState { idle, running, success, failure }

class StepFunctionalTest extends StatefulWidget {
  const StepFunctionalTest({super.key, required this.onNext});
  final VoidCallback onNext;

  @override
  State<StepFunctionalTest> createState() => _State();
}

class _State extends State<StepFunctionalTest> {
  _TestState _testState = _TestState.idle;
  int _countdown = 60;
  int _locationsReceived = 0;
  Timer? _timer;

  Future<void> _startTest() async {
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Iniciá sesión para probar el GPS.'),
          ),
        );
      }
      return;
    }

    try {
      await LocationService.init(session: session);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('No se pudo preparar el GPS: $e')),
        );
      }
      return;
    }

    setState(() {
      _testState = _TestState.running;
      _countdown = 60;
      _locationsReceived = 0;
    });

    await LocationService.start();

    bg.BackgroundGeolocation.onLocation(_onTestLocation);

    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      setState(() => _countdown--);
      if (_countdown <= 0) {
        t.cancel();
        _evaluate();
      }
    });
  }

  void _onTestLocation(bg.Location location) {
    if (!mounted || location.sample) return;
    setState(() => _locationsReceived++);
  }

  Future<void> _evaluate() async {
    bg.BackgroundGeolocation.removeListener(_onTestLocation);
    await LocationService.stop();
    if (!mounted) return;
    setState(() {
      _testState = _locationsReceived >= 3
          ? _TestState.success
          : _TestState.failure;
    });
  }

  Future<void> _reset() async {
    _timer?.cancel();
    _timer = null;
    bg.BackgroundGeolocation.removeListener(_onTestLocation);
    try {
      await LocationService.stop();
    } catch (_) {}
    if (mounted) {
      setState(() {
        _testState = _TestState.idle;
        _countdown = 60;
        _locationsReceived = 0;
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    bg.BackgroundGeolocation.removeListener(_onTestLocation);
    unawaited(LocationService.stop());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return switch (_testState) {
      _TestState.idle => OnboardingScaffold(
          icon: Icons.gps_fixed_rounded,
          title: 'Prueba de GPS',
          body: 'Vamos a probar que la ubicación en segundo plano funcione.\n\n'
              'Tocá "Iniciar prueba", minimizá la app y esperá 60 segundos.',
          primaryLabel: 'Iniciar prueba',
          onPrimary: _startTest,
        ),
      _TestState.running => OnboardingScaffold(
          icon: Icons.gps_fixed_rounded,
          title: 'Minimizá la app',
          body: 'Esperando señales GPS...\n\n'
              'Ubicaciones recibidas: $_locationsReceived',
          primaryLabel: 'Verificar ahora ($_countdown s)',
          onPrimary: () {
            _timer?.cancel();
            _timer = null;
            unawaited(_evaluate());
          },
        ),
      _TestState.success => OnboardingScaffold(
          icon: Icons.check_circle_outline_rounded,
          title: 'Tu app funciona',
          body: 'Recibimos $_locationsReceived ubicaciones. Estás listo para trabajar.',
          primaryLabel: 'Continuar',
          onPrimary: widget.onNext,
        ),
      _TestState.failure => OnboardingScaffold(
          icon: Icons.error_outline_rounded,
          title: 'No llegó tu ubicación',
          body: 'No recibimos señales GPS. Volvé a los pasos de permisos y revisá la configuración del dispositivo.',
          primaryLabel: 'Reintentar',
          onPrimary: _reset,
        ),
    };
  }
}
