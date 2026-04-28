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
  try {
    return await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
      ),
    );
  } catch (_) {
    return null;
  }
}
