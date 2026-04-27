import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Represents a destination chosen by the passenger on the search screen.
class DestinationResult {
  const DestinationResult({
    required this.label,
    required this.address,
    required this.location,
  });

  /// Short human-readable name (e.g. "Casa", "Hospital", "Plaza San Martín").
  final String label;

  /// Full address text shown as a subtitle.
  final String address;

  /// Geographic coordinates of the destination.
  final LatLng location;
}
