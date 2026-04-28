import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';

/// Bottom panel for the hybrid home layout.
///
/// Two states:
/// - [destinationLabel] is null → collapsed: shows "¿A dónde vas?" CTA.
/// - [destinationLabel] is set  → route-ready: shows origen → destino + Confirmar.
class RoutePanel extends StatelessWidget {
  const RoutePanel({
    super.key,
    required this.pickupAddress,
    required this.destinationLabel,
    required this.destinationAddress,
    required this.onSearchTap,
    required this.onClearDestination,
    required this.onConfirm,
  });

  final String pickupAddress;       // e.g. "Mi ubicación" or street
  final String? destinationLabel;   // null → collapsed state
  final String? destinationAddress;
  final VoidCallback onSearchTap;
  final VoidCallback onClearDestination;
  final VoidCallback onConfirm;

  @override
  Widget build(BuildContext context) {
    final isCollapsed = destinationLabel == null;
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final surface = isDark ? AppColors.neutralD100 : Colors.white;

    return Material(
      color: surface,
      elevation: 12,
      shadowColor: Colors.black.withValues(alpha: 0.4),
      borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: theme.colorScheme.outline.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 16),
              isCollapsed
                  ? _buildCollapsed(context)
                  : _buildRouteReady(context),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCollapsed(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: [
        // Origin row (read-only)
        _AddressRow(
          dotColor: const Color(0xFF4CAF50),
          label: 'ORIGEN',
          value: pickupAddress,
        ),
        const SizedBox(height: 10),
        // Destination tap target
        InkWell(
          onTap: onSearchTap,
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest
                  .withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: theme.colorScheme.primary.withValues(alpha: 0.3),
                width: 1.5,
                style: BorderStyle.solid,
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF44336).withValues(alpha: 0.5),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    '¿A dónde vas?',
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: theme.colorScheme.primary.withValues(alpha: 0.9),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                Icon(Icons.chevron_right,
                    color: theme.colorScheme.outline.withValues(alpha: 0.5)),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildRouteReady(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: [
        // Origin → Destination
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Column(
              children: [
                Container(
                  width: 10,
                  height: 10,
                  decoration: const BoxDecoration(
                      color: Color(0xFF4CAF50), shape: BoxShape.circle),
                ),
                Container(
                  width: 1,
                  height: 24,
                  color: theme.colorScheme.outline.withValues(alpha: 0.3),
                ),
                Container(
                  width: 10,
                  height: 10,
                  decoration: const BoxDecoration(
                      color: Color(0xFFF44336), shape: BoxShape.circle),
                ),
              ],
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    pickupAddress,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 14),
                  Text(
                    destinationLabel!,
                    style: theme.textTheme.titleSmall
                        ?.copyWith(fontWeight: FontWeight.w700),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (destinationAddress != null &&
                      destinationAddress != destinationLabel)
                    Text(
                      destinationAddress!,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                ],
              ),
            ),
            IconButton(
              onPressed: onClearDestination,
              icon: const Icon(Icons.edit_outlined, size: 20),
              tooltip: 'Cambiar destino',
            ),
          ],
        ),
        const SizedBox(height: 16),
        // Confirm CTA
        SizedBox(
          width: double.infinity,
          child: FilledButton(
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            onPressed: onConfirm,
            child: const Text(
              'Confirmar destino',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
            ),
          ),
        ),
      ],
    );
  }
}

class _AddressRow extends StatelessWidget {
  const _AddressRow({
    required this.dotColor,
    required this.label,
    required this.value,
  });

  final Color dotColor;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color:
            theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(color: dotColor, shape: BoxShape.circle),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                    letterSpacing: 0.8,
                  ),
                ),
                Text(
                  value,
                  style: theme.textTheme.bodyMedium,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
