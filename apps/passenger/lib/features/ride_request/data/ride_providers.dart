import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:http/http.dart' as http;

import '../../../core/env/env.dart';
import '../../../core/mock_auth.dart';
import 'models/driver_info_model.dart';
import 'models/fare_estimate_model.dart';
import 'models/place_prediction.dart';
import 'models/ride_model.dart';
import 'models/route_result.dart';
import 'ride_repository.dart';
import 'services/directions_service.dart';
import 'services/places_service.dart';

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

/// Last 10 unique destinations from this passenger's ride history.
final recentDestinationsProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) {
  return ref.watch(rideRepositoryProvider).getRecentDestinations();
});

/// POIs for the local town. Query is defensive — returns [] if table missing.
final placePoisProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final client = ref.watch(supabaseClientProvider);
  try {
    final result = await client
        .from('place_pois')
        .select('name, address_text, location')
        .limit(20);
    return (result as List).cast<Map<String, dynamic>>();
  } catch (_) {
    return [];
  }
});

/// Fare estimate keyed by "pickupLat,pickupLng|destLat,destLng".
final fareEstimateProvider =
    FutureProvider.family<FareEstimateModel, String>((ref, key) {
  final halves = key.split('|');
  if (halves.length != 2) throw ArgumentError('Invalid fare key: $key');
  final pickup = halves[0].split(',');
  final dest = halves[1].split(',');
  if (pickup.length != 2 || dest.length != 2) throw ArgumentError('Invalid lat,lng in fare key: $key');
  return ref.watch(rideRepositoryProvider).estimateFare(
        pickup: _parseLatLng(pickup),
        dest: _parseLatLng(dest),
      );
});

// ---------------------------------------------------------------------------
// Google Places + Directions
// ---------------------------------------------------------------------------

final _googleHttpClientProvider = Provider<http.Client>((ref) {
  final c = http.Client();
  ref.onDispose(c.close);
  return c;
});

final placesServiceProvider = Provider<PlacesService>((ref) {
  return PlacesService(
    httpClient: ref.watch(_googleHttpClientProvider),
    apiKey: Env.googleMapsApiKey,
  );
});

final directionsServiceProvider = Provider<DirectionsService>((ref) {
  return DirectionsService(
    httpClient: ref.watch(_googleHttpClientProvider),
    apiKey: Env.googleMapsApiKey,
  );
});

/// Key for Places autocomplete: query + optional location bias.
typedef AutocompleteKey = ({String query, LatLng? bias});

/// Live autocomplete results. Returns [] for queries shorter than 2 chars.
final placePredictionsProvider =
    FutureProvider.family<List<PlacePrediction>, AutocompleteKey>(
        (ref, key) async {
  if (key.query.trim().length < 2) return const [];
  return ref.watch(placesServiceProvider).autocomplete(
        key.query.trim(),
        locationBias: key.bias,
      );
});

/// Key for Directions: origin + destination snapshot.
typedef RouteKey = ({LatLng origin, LatLng destination});

/// Driving route between origin and destination.
final routeProvider =
    FutureProvider.family<RouteResult, RouteKey>((ref, key) async {
  return ref.watch(directionsServiceProvider).route(key.origin, key.destination);
});
