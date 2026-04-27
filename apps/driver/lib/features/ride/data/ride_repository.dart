import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:remis_driver/features/ride/data/ride_model.dart';

class DriverRideRepository {
  DriverRideRepository(this._client);
  final SupabaseClient _client;

  Stream<RideModel?> watchIncomingOffer(String driverId) {
    return _client
        .from('rides')
        .stream(primaryKey: ['id'])
        .eq('driver_id', driverId)
        .map((rows) {
          final incoming = rows.where((row) {
            final status = row['status'] as String?;
            return status == 'requested' || status == 'assigned';
          }).toList();
          if (incoming.isEmpty) return null;
          return RideModel.fromMap(incoming.first);
        });
  }

  Stream<RideModel?> watchActiveRide(String driverId) {
    return _client
        .from('rides')
        .stream(primaryKey: ['id'])
        .eq('driver_id', driverId)
        .map((rows) {
          final activeStatuses = {
            'assigned',
            'en_route_to_pickup',
            'waiting_passenger',
            'on_trip',
          };
          final active = rows.where((row) {
            final status = row['status'] as String?;
            return activeStatuses.contains(status);
          }).toList();
          if (active.isEmpty) return null;
          return RideModel.fromMap(active.first);
        });
  }

  Future<void> acceptRide(String rideId, String driverId) async {
    await _client.from('rides').update({
      'status': 'assigned',
      'driver_id': driverId,
      'assigned_at': DateTime.now().toIso8601String(),
    }).eq('id', rideId);
  }

  Future<void> rejectRide(String rideId) async {
    await _client.from('rides').update({
      'status': 'requested',
      'driver_id': null,
    }).eq('id', rideId);
  }

  Future<void> markEnRoute(String rideId) async {
    await _client.from('rides').update({
      'status': 'en_route_to_pickup',
    }).eq('id', rideId);
  }

  Future<void> markArrived(String rideId) async {
    await _client.from('rides').update({
      'status': 'waiting_passenger',
      'pickup_arrived_at': DateTime.now().toIso8601String(),
    }).eq('id', rideId);
  }

  Future<void> startTrip(String rideId) async {
    await _client.from('rides').update({
      'status': 'on_trip',
      'started_at': DateTime.now().toIso8601String(),
    }).eq('id', rideId);
  }

  Future<void> endTrip(
    String rideId, {
    double? distanceMeters,
    double? fareArs,
  }) async {
    await _client.from('rides').update({
      'status': 'completed',
      'ended_at': DateTime.now().toIso8601String(),
      if (distanceMeters != null) 'distance_meters': distanceMeters,
      if (fareArs != null) 'final_fare_ars': fareArs,
    }).eq('id', rideId);
  }

  Future<void> cancelRide(String rideId) async {
    await _client.from('rides').update({
      'status': 'cancelled_by_driver',
    }).eq('id', rideId);
  }
}
