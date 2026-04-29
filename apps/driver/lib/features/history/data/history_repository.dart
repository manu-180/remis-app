import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:remis_driver/features/ride/data/ride_model.dart';

class DriverHistoryRepository {
  DriverHistoryRepository(this._client);
  final SupabaseClient _client;

  Future<List<RideModel>> getRideHistory({
    required String driverId,
    required int page,
    int pageSize = 20,
  }) async {
    final result = await _client
        .from('rides')
        .select()
        .eq('driver_id', driverId)
        .eq('status', 'completed')
        .order('ended_at', ascending: false)
        .range(page * pageSize, (page + 1) * pageSize - 1);
    return (result as List)
        .map((e) => RideModel.fromMap(e as Map<String, dynamic>))
        .toList();
  }

  Future<double> getTodayEarnings(String driverId) async {
    final today = DateTime.now();
    final startOfDay = DateTime(today.year, today.month, today.day);
    final result = await _client
        .from('rides')
        .select('final_fare_ars')
        .eq('driver_id', driverId)
        .eq('status', 'completed')
        .gte('ended_at', startOfDay.toIso8601String());
    double total = 0;
    for (final row in (result as List)) {
      total += (row['final_fare_ars'] as num?)?.toDouble() ?? 0;
    }
    return total;
  }

  Future<double> getMonthEarnings(String driverId) async {
    final today = DateTime.now();
    final startOfMonth = DateTime(today.year, today.month, 1);
    final result = await _client
        .from('rides')
        .select('final_fare_ars')
        .eq('driver_id', driverId)
        .eq('status', 'completed')
        .gte('ended_at', startOfMonth.toIso8601String());
    double total = 0;
    for (final row in (result as List)) {
      total += (row['final_fare_ars'] as num?)?.toDouble() ?? 0;
    }
    return total;
  }
}
