/// Formats a duration as a human-readable ETA string in Spanish.
/// e.g. "5 min", "1 h 12 min", "2 h"
String etaFormat(Duration duration) {
  final totalMinutes = duration.inMinutes;
  if (totalMinutes < 1) return 'menos de 1 min';
  if (totalMinutes < 60) return '$totalMinutes min';

  final hours = duration.inHours;
  final remainingMinutes = totalMinutes - hours * 60;
  if (remainingMinutes == 0) return '$hours h';
  return '$hours h $remainingMinutes min';
}
