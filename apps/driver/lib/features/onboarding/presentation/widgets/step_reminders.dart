import 'package:flutter/material.dart';
import 'package:remis_design_system/remis_design_system.dart';

class StepReminders extends StatefulWidget {
  const StepReminders({super.key, required this.onComplete});
  final VoidCallback onComplete;

  @override
  State<StepReminders> createState() => _State();
}

class _State extends State<StepReminders> {
  bool _accepted = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Spacer(),
            Icon(Icons.checklist_rounded, size: 48, color: theme.colorScheme.primary),
            const SizedBox(height: 24),
            Text(
              'Antes de arrancar',
              style: interTight(
                fontSize: RTextSize.xl,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 24),
            const _Reminder(text: 'Mantené el cargador conectado en el auto.'),
            const _Reminder(text: 'No cerrés la app desde el menú de recientes.'),
            const _Reminder(
              text:
                  'Si la app falla, te avisamos por SMS y ese turno no se te descuenta.',
            ),
            const Spacer(),
            Row(
              children: [
                Checkbox(
                  value: _accepted,
                  onChanged: (v) => setState(() => _accepted = v ?? false),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text('Entiendo', style: inter(fontSize: RTextSize.base)),
                ),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 64,
              child: FilledButton(
                onPressed: _accepted ? widget.onComplete : null,
                child: const Text('Comenzar a trabajar'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Reminder extends StatelessWidget {
  const _Reminder({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.check, size: 20),
          const SizedBox(width: 12),
          Expanded(child: Text(text, style: inter(fontSize: RTextSize.base))),
        ],
      ),
    );
  }
}
