import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Returns a [LatLngBounds] that contains all [points].
/// Throws [ArgumentError] if [points] is empty.
LatLngBounds boundsFromPoints(List<LatLng> points) {
  assert(points.isNotEmpty, 'points must not be empty');
  double minLat = points.first.latitude;
  double maxLat = points.first.latitude;
  double minLng = points.first.longitude;
  double maxLng = points.first.longitude;

  for (final p in points) {
    if (p.latitude < minLat) minLat = p.latitude;
    if (p.latitude > maxLat) maxLat = p.latitude;
    if (p.longitude < minLng) minLng = p.longitude;
    if (p.longitude > maxLng) maxLng = p.longitude;
  }

  return LatLngBounds(
    southwest: LatLng(minLat, minLng),
    northeast: LatLng(maxLat, maxLng),
  );
}

/// Pads a [LatLngBounds] by [factor] on each side (0.1 = 10% padding).
LatLngBounds padBounds(LatLngBounds bounds, double factor) {
  final latDelta = (bounds.northeast.latitude - bounds.southwest.latitude) * factor;
  final lngDelta = (bounds.northeast.longitude - bounds.southwest.longitude) * factor;
  return LatLngBounds(
    southwest: LatLng(
      bounds.southwest.latitude - latDelta,
      bounds.southwest.longitude - lngDelta,
    ),
    northeast: LatLng(
      bounds.northeast.latitude + latDelta,
      bounds.northeast.longitude + lngDelta,
    ),
  );
}
