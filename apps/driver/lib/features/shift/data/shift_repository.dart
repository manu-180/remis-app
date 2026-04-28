import 'package:supabase_flutter/supabase_flutter.dart';

class ShiftRepository {
  ShiftRepository(this._client);
  final SupabaseClient _client;

  Future<void> startShift(String driverId) async {
    await _client.from('drivers').update({
      'is_online': true,
      'current_status': 'available',
    }).eq('id', driverId);
  }

  Future<void> pauseShift(String driverId) async {
    await _client.from('drivers').update({
      'current_status': 'on_break',
    }).eq('id', driverId);
  }

  Future<void> resumeShift(String driverId) async {
    await _client.from('drivers').update({
      'current_status': 'available',
    }).eq('id', driverId);
  }

  Future<void> endShift(String driverId) async {
    await _client.from('drivers').update({
      'is_online': false,
      'current_status': 'offline',
    }).eq('id', driverId);
  }

  Future<Map<String, dynamic>?> getShiftSummary(String driverId) async {
    final result = await _client.rpc('get_shift_summary', params: {
      'p_driver_id': driverId,
    });
    return result as Map<String, dynamic>?;
  }

  Future<List<Map<String, dynamic>>> getExpiredDocuments(
      String driverId) async {
    final result = await _client
        .from('driver_documents')
        .select('document_type, expires_at')
        .eq('driver_id', driverId)
        .lt('expires_at', DateTime.now().toIso8601String())
        .isFilter('deleted_at', null);
    return List<Map<String, dynamic>>.from(result as List);
  }
}
