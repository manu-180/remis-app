import 'package:supabase_flutter/supabase_flutter.dart';

class DriverProfileRepository {
  DriverProfileRepository(this._client);
  final SupabaseClient _client;

  Future<Map<String, dynamic>?> getDriverWithVehicle(String driverId) async {
    final result = await _client
        .from('drivers')
        .select('mobile_number, vehicle_id, vehicles(plate, mobile_number)')
        .eq('id', driverId)
        .maybeSingle();
    return result;
  }

  Future<List<Map<String, dynamic>>> getDocuments(String driverId) async {
    final result = await _client
        .from('driver_documents')
        .select('document_type, expires_at')
        .eq('driver_id', driverId)
        .isFilter('deleted_at', null)
        .order('document_type');
    return List<Map<String, dynamic>>.from(result as List);
  }
}
