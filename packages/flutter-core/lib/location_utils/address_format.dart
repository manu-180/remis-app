/// Formats a street address for display in AR locale style.
/// e.g. "Centenario 1234, Anguil"
String formatAddress({
  required String street,
  required String number,
  String? city,
}) {
  final base = '$street $number';
  if (city != null && city.isNotEmpty) return '$base, $city';
  return base;
}

/// Returns a short display label for a coordinates-based address.
/// Falls back to coordinate string when no label is available.
String coordsLabel(double lat, double lng, {String? label}) {
  if (label != null && label.isNotEmpty) return label;
  return '${lat.toStringAsFixed(5)}, ${lng.toStringAsFixed(5)}';
}
