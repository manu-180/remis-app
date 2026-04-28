import 'dart:io';

import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:remis_driver/features/onboarding/presentation/widgets/onboarding_scaffold.dart';

class StepOemSpecific extends StatefulWidget {
  const StepOemSpecific({super.key, required this.onNext});
  final VoidCallback onNext;

  @override
  State<StepOemSpecific> createState() => _State();
}

class _State extends State<StepOemSpecific> {
  _OemGuide? _guide;

  @override
  void initState() {
    super.initState();
    _detectOem();
  }

  Future<void> _detectOem() async {
    if (Platform.isIOS) {
      setState(() {
        _guide = const _OemGuide(
          brand: 'iOS',
          steps: [
            'Abrí Ajustes → Remís Driver.',
            'Activá actualización en segundo plano y ubicación en "Siempre" si aplica.',
          ],
        );
      });
      return;
    }

    if (!Platform.isAndroid) {
      setState(() {
        _guide = const _OemGuide(
          brand: 'Tu dispositivo',
          steps: [
            'Buscá en Ajustes batería u optimización de apps.',
            'Desactivá la restricción para "Remís Driver".',
          ],
        );
      });
      return;
    }

    final info = DeviceInfoPlugin();
    final android = await info.androidInfo;
    final manufacturer = android.manufacturer.toLowerCase();
    setState(() {
      if (manufacturer.contains('xiaomi') ||
          manufacturer.contains('redmi') ||
          manufacturer.contains('poco')) {
        _guide = const _OemGuide(
          brand: 'Xiaomi / Redmi / POCO',
          steps: [
            'Abrí "Seguridad" → "Permisos" → "Inicio automático".',
            'Habilitá "Remís Driver" en la lista.',
            'Volvé a "Permisos" → "Sin restricciones de actividad".',
          ],
          settingsIntent: 'miui.intent.action.APP_PERM_EDITOR',
        );
      } else if (manufacturer.contains('huawei') || manufacturer.contains('honor')) {
        _guide = const _OemGuide(
          brand: 'Huawei / Honor',
          steps: [
            'Abrí "Administrador del teléfono" → "Inicio de la aplicación".',
            'Buscá "Remís Driver" y activá "Gestión manual".',
            'Habilitá inicio automático, inicio secundario y ejecución en segundo plano.',
          ],
        );
      } else if (manufacturer.contains('oppo') ||
          manufacturer.contains('realme') ||
          manufacturer.contains('oneplus')) {
        _guide = const _OemGuide(
          brand: 'OPPO / Realme / OnePlus',
          steps: [
            'Abrí "Ajustes" → "Administración de la batería" → "Optimización de la batería".',
            'Buscá "Remís Driver" y seleccioná "No optimizar".',
          ],
        );
      } else if (manufacturer.contains('samsung')) {
        _guide = const _OemGuide(
          brand: 'Samsung',
          steps: [
            'Abrí "Cuidado del dispositivo" → "Batería" → "Límites de uso en segundo plano".',
            'Quitá "Remís Driver" de la lista de apps en suspensión.',
          ],
        );
      } else {
        _guide = const _OemGuide(
          brand: 'Tu dispositivo',
          steps: [
            'Buscá en Ajustes → Batería → Optimización o Ahorro.',
            'Desactivá la restricción para "Remís Driver".',
            'Habilitá el inicio automático si tu dispositivo lo permite.',
          ],
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_guide == null) {
      return const Center(child: CircularProgressIndicator());
    }
    return OnboardingScaffold(
      icon: Icons.phone_android_rounded,
      title: '${_guide!.brand}: no matar la app',
      body: _guide!.steps
          .asMap()
          .entries
          .map((e) => '${e.key + 1}. ${e.value}')
          .join('\n\n'),
      primaryLabel: 'Listo',
      onPrimary: widget.onNext,
      secondaryLabel: _guide!.settingsIntent != null ? 'Abrir ajustes' : null,
      onSecondary: _guide!.settingsIntent != null ? openAppSettings : null,
    );
  }
}

class _OemGuide {
  const _OemGuide({
    required this.brand,
    required this.steps,
    this.settingsIntent,
  });
  final String brand;
  final List<String> steps;
  final String? settingsIntent;
}
