import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import 'models/driver_info_model.dart';
import 'models/fare_estimate_model.dart';
import 'models/ride_model.dart';
import 'ride_repository.dart';

LatLng _parseLatLng(List<String> parts) =>
    LatLng(double.parse(parts[0]), double.parse(parts[1]));

/// Realtime stream for a specific ride by ID.
final activeRideStreamProvider =
    StreamProvider.family<RideModel, String>((ref, rideId) {
  return ref.watch(rideRepositoryProvider).watchRide(rideId);
});

/// Realtime stream for a driver's current location.
final driverLocationStreamProvider =
    StreamProvider.family<DriverInfoModel?, String>((ref, driverId) {
  return ref.watch(rideRepositoryProvider).watchDriverLocation(driverId);
});

/// One-shot future: checks for an active ride on home screen init.
final activeRideFutureProvider = FutureProvider<RideModel?>((ref) {
  return ref.watch(rideRepositoryProvider).getActiveRide();
});

/// One-shot future: passenger's top-5 frequent addresses.
final frequentAddressesProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) {
  return ref.watch(rideRepositoryProvider).getFrequentAddresses();
});

/// Fare estimate keyed by "pickupLat,pickupLng|destLat,destLng".
final fareEstimateProvider =
    FutureProvider.family<FareEstimateModel, String>((ref, key) {
  final halves = key.split('|');
  final pickup = halves[0].split(',');
  final dest = halves[1].split(',');
  return ref.watch(rideRepositoryProvider).estimateFare(
        pickup: _parseLatLng(pickup),
        dest: _parseLatLng(dest),
      );
});
