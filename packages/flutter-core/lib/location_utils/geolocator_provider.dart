import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'geolocator_provider.g.dart';

/// Emits the current device position whenever it changes (foreground only).
/// Requires location permission before subscribing.
@riverpod
Stream<Position> livePosition(Ref ref) {
  const settings = LocationSettings(
    accuracy: LocationAccuracy.high,
    distanceFilter: 10,
  );
  return Geolocator.getPositionStream(locationSettings: settings);
}

Future<Position?> getCurrentPositionOrNull() async {
  // Sin timeLimit, en Android la primera lectura tras un permiso recién
  // otorgado puede colgarse esperando el primer fix de GPS (cold start).
  // 15 s es suficiente para indoor + warm-up; si vence devolvemos null y el
  // caller hace fallback a getLastKnownPosition.
  try {
    return await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 15),
      ),
    );
  } catch (_) {
    try {
      return await Geolocator.getLastKnownPosition();
    } catch (_) {
      return null;
    }
  }
}
