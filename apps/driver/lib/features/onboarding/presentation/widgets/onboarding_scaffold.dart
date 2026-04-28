import 'package:flutter/material.dart';
import 'package:remis_design_system/remis_design_system.dart';

class OnboardingScaffold extends StatelessWidget {
  const OnboardingScaffold({
    super.key,
    required this.icon,
    required this.title,
    required this.body,
    required this.primaryLabel,
    required this.onPrimary,
    this.secondaryLabel,
    this.onSecondary,
    this.warning,
  });

  final IconData icon;
  final String title;
  final String body;
  final String primaryLabel;
  final VoidCallback onPrimary;
  final String? secondaryLabel;
  final VoidCallback? onSecondary;
  final String? warning;

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
            Icon(icon, size: 48, color: theme.colorScheme.primary),
            const SizedBox(height: 24),
            Text(title,
                style: interTight(
                    fontSize: RTextSize.xl, fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            Text(body,
                style: inter(
                    fontSize: RTextSize.base,
                    color: theme.colorScheme.onSurfaceVariant)),
            if (warning != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: kDanger.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(RRadius.md),
                ),
                child: Text(warning!,
                    style: inter(fontSize: RTextSize.sm, color: kDanger)),
              ),
            ],
            const Spacer(),
            SizedBox(
              width: double.infinity,
              height: 64,
              child: FilledButton(
                onPressed: onPrimary,
                child: Text(primaryLabel),
              ),
            ),
            if (secondaryLabel != null) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: onSecondary,
                  child: Text(secondaryLabel!),
                ),
              ),
            ],
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}
