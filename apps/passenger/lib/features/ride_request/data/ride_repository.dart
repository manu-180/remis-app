import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/mock_auth.dart';
import 'models/driver_info_model.dart';
import 'models/fare_estimate_model.dart';
import 'models/ride_model.dart';

class RideRepository {
  const RideRepository(this._client, this._userId);

  final SupabaseClient _client;
  final String _userId;

  Future<FareEstimateModel> estimateFare({
    required LatLng pickup,
    required LatLng dest,
  }) async {
    final result = await _client.rpc('estimate_fare', params: {
      'pickup_lat': pickup.latitude,
      'pickup_lng': pickup.longitude,
      'dest_lat': dest.latitude,
      'dest_lng': dest.longitude,
    });
    if (result == null) throw Exception('estimate_fare returned null');
    final list = result as List;
    if (list.isEmpty) throw Exception('No fare estimate for this route');
    final row = list.first as Map<String, dynamic>;
    return FareEstimateModel.fromMap(row);
  }

  Future<RideModel> createRide({
    required LatLng pickup,
    required LatLng dest,
    required String pickupAddress,
    required String destAddress,
    String? notes,
    String paymentMethod = 'cash',
  }) async {
    final result = await _client
        .from('rides')
        .insert({
          'passenger_id': _userId,
          'pickup_location':
              'SRID=4326;POINT(${pickup.longitude} ${pickup.latitude})',
          'dest_location':
              'SRID=4326;POINT(${dest.longitude} ${dest.latitude})',
          'pickup_address': pickupAddress,
          'dest_address': destAddress,
          'notes': notes,
          'payment_method': paymentMethod,
          'status': 'requested',
        })
        .select()
        .single();
    return RideModel.fromMap(result);
  }

  Future<RideModel?> getActiveRide() async {
    final result = await _client
        .from('rides')
        .select()
        .eq('passenger_id', _userId)
        .inFilter('status', [
          'requested',
          'assigned',
          'en_route_to_pickup',
          'waiting_passenger',
          'on_trip',
        ])
        .order('created_at', ascending: false)
        .limit(1)
        .maybeSingle();
    if (result == null) return null;
    return RideModel.fromMap(result);
  }

  Future<void> cancelRide(String rideId, String reason) async {
    await _client.rpc('cancel_ride', params: {
      'p_ride_id': rideId,
      'p_actor_id': _userId,
      'p_reason': reason,
    });
  }

  Stream<RideModel> watchRide(String rideId) {
    return _client
        .from('rides')
        .stream(primaryKey: ['id'])
        .eq('id', rideId)
        .map((rows) {
          if (rows.isEmpty) throw Exception('Ride not found');
          return RideModel.fromMap(rows.first);
        });
  }

  Stream<DriverInfoModel?> watchDriverLocation(String driverId) {
    return _client
        .from('driver_current_location')
        .stream(primaryKey: ['driver_id'])
        .eq('driver_id', driverId)
        .map((rows) {
          if (rows.isEmpty) return null;
          return DriverInfoModel.fromMap(rows.first);
        });
  }

  Future<DriverInfoModel?> getDriverInfo(String driverId) async {
    final result = await _client
        .from('drivers')
        .select('''
          id,
          mobile_number,
          rating,
          profiles!inner(full_name),
          vehicles!vehicle_id(plate, vehicle_type, color),
          driver_current_location!inner(location, heading)
        ''')
        .eq('id', driverId)
        .maybeSingle();
    if (result == null) return null;
    return DriverInfoModel.fromMap(result);
  }

  Future<List<RideModel>> getRideHistory({
    int page = 0,
    int pageSize = 20,
  }) async {
    final result = await _client
        .from('rides')
        .select()
        .eq('passenger_id', _userId)
        .order('created_at', ascending: false)
        .range(page * pageSize, (page + 1) * pageSize - 1);
    return (result as List)
        .map((e) => RideModel.fromMap(e as Map<String, dynamic>))
        .toList();
  }

  Future<String> createSharedTrip(String rideId) async {
    final result = await _client.rpc('create_shared_trip', params: {
      'p_ride_id': rideId,
      'p_user_id': _userId,
    });
    final token = result?.toString();
    if (token == null || token.isEmpty) throw Exception('create_shared_trip returned no token');
    return token;
  }

  Future<void> submitRating({
    required String rideId,
    required String driverId,
    required int stars,
    String? comment,
  }) async {
    await _client.from('ride_ratings').insert({
      'ride_id': rideId,
      'passenger_id': _userId,
      'driver_id': driverId,
      'stars': stars,
      'comment': comment,
    });
  }

  Future<List<Map<String, dynamic>>> getFrequentAddresses() async {
    final result = await _client
        .from('frequent_addresses')
        .select()
        .eq('passenger_id', _userId)
        .order('use_count', ascending: false)
        .limit(5);
    return (result as List).cast<Map<String, dynamic>>();
  }

  Future<List<Map<String, dynamic>>> getRecentDestinations() async {
    final result = await _client
        .from('rides')
        .select('dest_address, dest_location')
        .eq('passenger_id', _userId)
        .not('dest_address', 'is', null)
        .order('created_at', ascending: false)
        .limit(30);
    // Deduplicate by dest_address, keep first 10 unique
    final seen = <String>{};
    return (result as List)
        .cast<Map<String, dynamic>>()
        .where((r) => seen.add(r['dest_address'] as String))
        .take(10)
        .toList();
  }

  Future<void> incrementFrequentAddress({
    required String addressText,
    required LatLng location,
    String? label,
  }) async {
    // Upsert the address record for this passenger
    await _client.from('frequent_addresses').upsert(
      {
        'passenger_id': _userId,
        'address_text': addressText,
        'location':
            'SRID=4326;POINT(${location.longitude} ${location.latitude})',
        'label': label,
        'use_count': 1,
        'last_used_at': DateTime.now().toIso8601String(),
      },
      onConflict: 'passenger_id,address_text',
    );
    // Increment use_count if the row already existed — best effort, no RPC yet
    await _client
        .rpc('increment_frequent_address_count', params: {
          'p_passenger_id': _userId,
          'p_address_text': addressText,
        })
        .catchError((_) => null);
  }
}

final rideRepositoryProvider = Provider<RideRepository>((ref) {
  final client = ref.watch(supabaseClientProvider);
  final user = ref.watch(currentUserProvider);
  if (user == null) throw Exception('Not authenticated');
  return RideRepository(client, user.id);
});
