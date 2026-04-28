import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class RouteInfoChip extends StatelessWidget {
  const RouteInfoChip({
    super.key,
    required this.fareArs,
    required this.durationMinutes,
    required this.distanceKm,
  });

  final double? fareArs;       // null → fare unavailable
  final int durationMinutes;
  final int distanceKm;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final fmt = NumberFormat('#,###', 'es_AR');
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.78),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (fareArs != null) ...[
            Text(
              '~\$${fmt.format(fareArs!.round())}',
              style: theme.textTheme.titleSmall?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w800,
              ),
            ),
            _Dot(),
          ],
          Text(
            '$durationMinutes min',
            style: theme.textTheme.bodyMedium
                ?.copyWith(color: Colors.white.withValues(alpha: 0.85)),
          ),
          _Dot(),
          Text(
            '$distanceKm km',
            style: theme.textTheme.bodyMedium
                ?.copyWith(color: Colors.white.withValues(alpha: 0.85)),
          ),
        ],
      ),
    );
  }
}

class _Dot extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child:
          Text('·', style: TextStyle(color: Colors.white.withValues(alpha: 0.4))),
    );
  }
}
