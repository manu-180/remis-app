import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:remis_flutter_core/remis_flutter_core.dart';

class KycRepository {
  KycRepository(this._client);
  final SupabaseClient _client;

  Future<Result<bool, AppError>> createKycSession(String driverId) async {
    try {
      final response = await _client.functions.invoke(
        'kyc-create-session',
        body: {'driver_id': driverId},
      );

      if (response.data == null) {
        return Result.err(const DomainError(message: 'No se pudo enviar la solicitud de verificación.'));
      }

      return Result.ok(true);
    } catch (e) {
      return Result.err(UnknownError(cause: e));
    }
  }

  Future<Result<bool, AppError>> checkKycStatus(String driverId) async {
    try {
      final rows = await _client
          .from('kyc_verifications')
          .select()
          .eq('driver_id', driverId)
          .eq('status', 'approved')
          .limit(1);

      return Result.ok(rows.isNotEmpty);
    } catch (e) {
      return Result.err(UnknownError(cause: e));
    }
  }
}
