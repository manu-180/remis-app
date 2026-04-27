import 'package:supabase_flutter/supabase_flutter.dart';
import '../result/result.dart';
import '../errors/app_error.dart';

abstract interface class AuthRepository {
  Future<Result<void, AuthError>> signInWithPhone(String phone);
  Future<Result<void, AuthError>> verifyOtp({
    required String phone,
    required String token,
  });
  Future<void> signOut();
  Stream<AuthState> get authStateChanges;
  Session? get currentSession;
}

class SupabaseAuthRepository implements AuthRepository {
  const SupabaseAuthRepository(this._client);
  final SupabaseClient _client;

  @override
  Future<Result<void, AuthError>> signInWithPhone(String phone) async {
    try {
      await _client.auth.signInWithOtp(
        phone: phone,
        shouldCreateUser: false, // Only pre-registered drivers
      );
      return const Ok(null);
    } on AuthException catch (e) {
      return Err(AuthError(code: _mapAuthException(e), cause: e));
    } catch (e) {
      return Err(AuthError(code: 'unknown', cause: e));
    }
  }

  @override
  Future<Result<void, AuthError>> verifyOtp({
    required String phone,
    required String token,
  }) async {
    try {
      await _client.auth.verifyOTP(
        phone: phone,
        token: token,
        type: OtpType.sms,
      );
      return const Ok(null);
    } on AuthException catch (e) {
      return Err(AuthError(code: _mapAuthException(e), cause: e));
    } catch (e) {
      return Err(AuthError(code: 'unknown', cause: e));
    }
  }

  @override
  Future<void> signOut() => _client.auth.signOut();

  @override
  Stream<AuthState> get authStateChanges => _client.auth.onAuthStateChange;

  @override
  Session? get currentSession => _client.auth.currentSession;

  String _mapAuthException(AuthException e) {
    final msg = e.message.toLowerCase();
    if (msg.contains('invalid') && msg.contains('phone')) return 'invalid_phone';
    if (msg.contains('invalid') &&
        (msg.contains('otp') || msg.contains('token'))) return 'invalid_otp';
    if (msg.contains('expired')) return 'otp_expired';
    if (msg.contains('not found') || msg.contains('no account')) {
      return 'user_not_found';
    }
    return 'unknown';
  }
}
