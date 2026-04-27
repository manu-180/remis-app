import 'package:intl/intl.dart';

/// Returns a human-readable relative time string in Spanish.
/// e.g. "hace 5 min", "en 12 min", "ayer 14:30", "hoy 09:00"
String relativeTime(DateTime dateTime, {DateTime? now}) {
  final reference = now ?? DateTime.now();
  final diff = reference.difference(dateTime);

  if (diff.inSeconds.abs() < 60) return 'ahora';

  if (diff.isNegative) {
    // Future
    final future = dateTime.difference(reference);
    if (future.inMinutes < 60) return 'en ${future.inMinutes} min';
    if (future.inHours < 24) return 'en ${future.inHours} h';
  } else {
    // Past
    if (diff.inMinutes < 60) return 'hace ${diff.inMinutes} min';
    if (diff.inHours < 24) return 'hace ${diff.inHours} h';
  }

  final timeStr = DateFormat('HH:mm').format(dateTime);
  final today = DateTime(reference.year, reference.month, reference.day);
  final yesterday = today.subtract(const Duration(days: 1));
  final day = DateTime(dateTime.year, dateTime.month, dateTime.day);

  if (day == today) return 'hoy $timeStr';
  if (day == yesterday) return 'ayer $timeStr';

  return DateFormat('d MMM HH:mm', 'es').format(dateTime);
}
