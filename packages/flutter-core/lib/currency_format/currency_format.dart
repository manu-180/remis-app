import 'package:intl/intl.dart';

final _arsFormatter = NumberFormat.currency(
  locale: 'es_AR',
  symbol: '\$',
  decimalDigits: 2,
);

final _arsFormatterNoDecimals = NumberFormat.currency(
  locale: 'es_AR',
  symbol: '\$',
  decimalDigits: 0,
);

/// Formats [amount] as ARS currency string.
/// e.g. formatArs(1234.56) → "$1.234,56"
/// Set [showDecimals] to false for whole-number display.
String formatArs(double amount, {bool showDecimals = true}) {
  return showDecimals
      ? _arsFormatter.format(amount)
      : _arsFormatterNoDecimals.format(amount);
}

/// Parses an ARS-formatted string back to double.
/// Returns null if parsing fails.
double? parseArs(String value) {
  try {
    return _arsFormatter.parse(value).toDouble();
  } catch (_) {
    return null;
  }
}
