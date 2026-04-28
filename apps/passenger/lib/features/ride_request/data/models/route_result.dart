import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:google_polyline_algorithm/google_polyline_algorithm.dart';

/// The decoded result of a Google Directions API call.
class RouteResult {
  const RouteResult({
    required this.polyline,
    required this.distanceMeters,
    required this.durationSeconds,
  });

  final List<LatLng> polyline;
  final int distanceMeters;
  final int durationSeconds;

  factory RouteResult.fromDirectionsJson(Map<String, dynamic> json) {
    final status = json['status'] as String?;
    if (status != 'OK') {
      throw DirectionsException(status ?? 'UNKNOWN', 'Directions returned $status');
    }
    final routes = json['routes'] as List?;
    if (routes == null || routes.isEmpty) {
      throw DirectionsException('NO_ROUTES', 'Directions returned empty routes');
    }
    final route = routes.first as Map<String, dynamic>;
    final encoded =
        (route['overview_polyline'] as Map<String, dynamic>)['points'] as String;
    final decoded = decodePolyline(encoded)
        .map((p) => LatLng((p[0] as num).toDouble(), (p[1] as num).toDouble()))
        .toList();
    final leg = (route['legs'] as List).first as Map<String, dynamic>;
    return RouteResult(
      polyline: decoded,
      distanceMeters: (leg['distance']['value'] as num).toInt(),
      durationSeconds: (leg['duration']['value'] as num).toInt(),
    );
  }

  int get distanceKm => (distanceMeters / 1000).round();
  int get durationMinutes => (durationSeconds / 60).round();
}

class DirectionsException implements Exception {
  DirectionsException(this.status, this.message);
  final String status;
  final String message;
  @override
  String toString() => 'DirectionsException($status): $message';
}
