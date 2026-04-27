/// Argentina phone utilities.
/// Handles +54 9 XXXX XXXXXX format (La Pampa area 2954).

const _arCountryCode = '+54 9';

/// Returns true when [phone] is a valid Argentine mobile number.
/// Accepts formats: +5492954555123, 2954555123, 02954555123.
bool isValidArPhone(String phone) {
  final digits = phone.replaceAll(RegExp(r'[\s\-\+]'), '');
  // Strip country/trunk prefixes
  String local = digits;
  if (local.startsWith('549')) local = local.substring(3);
  if (local.startsWith('54')) local = local.substring(2);
  if (local.startsWith('0')) local = local.substring(1);
  if (local.startsWith('9')) local = local.substring(1); // mobile prefix

  // After stripping, should be 10 digits (area + number)
  return RegExp(r'^\d{10}$').hasMatch(local);
}

/// Formats a phone for display: "+54 9 2954 555 1234"
String formatArPhone(String phone) {
  final digits = phone.replaceAll(RegExp(r'[\s\-\+]'), '');
  String local = digits;
  if (local.startsWith('549')) local = local.substring(3);
  if (local.startsWith('54')) local = local.substring(2);
  if (local.startsWith('0')) local = local.substring(1);
  if (local.startsWith('9')) local = local.substring(1);

  if (local.length < 10) return phone;

  // Split: area (4 digits for most AR regions) + number (6 digits)
  final area = local.substring(0, 4);
  final part1 = local.substring(4, 7);
  final part2 = local.substring(7, 10);
  final extra = local.length > 10 ? local.substring(10) : '';

  return '$_arCountryCode $area $part1 $part2$extra'.trim();
}

/// Masks all but the last 4 digits: "***1234"
String maskArPhone(String phone) {
  final digits = phone.replaceAll(RegExp(r'[\s\-\+]'), '');
  if (digits.length < 4) return '***${digits}';
  return '***${digits.substring(digits.length - 4)}';
}
