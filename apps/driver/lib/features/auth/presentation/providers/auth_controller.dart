import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:remis_flutter_core/remis_flutter_core.dart';

part 'auth_controller.g.dart';

sealed class AuthUiState {
  const AuthUiState();
}

final class AuthIdle extends AuthUiState {
  const AuthIdle();
}

final class AuthLoading extends AuthUiState {
  const AuthLoading();
}

final class AuthSuccess extends AuthUiState {
  const AuthSuccess();
}

final class AuthFailure extends AuthUiState {
  const AuthFailure(this.message);
  final String message;
}

@riverpod
class DriverAuthController extends _$DriverAuthController {
  @override
  AuthUiState build() => const AuthIdle();

  Future<bool> sendOtp(String phone) async {
    state = const AuthLoading();
    final repo = ref.read(authRepositoryProvider);
    final result = await repo.signInWithPhone(phone);
    return result.fold(
      (_) {
        state = const AuthSuccess();
        return true;
      },
      (err) {
        state = AuthFailure(err.userMessage);
        return false;
      },
    );
  }

  Future<bool> verifyOtp({required String phone, required String token}) async {
    state = const AuthLoading();
    final repo = ref.read(authRepositoryProvider);
    final result = await repo.verifyOtp(phone: phone, token: token);
    return result.fold(
      (_) {
        state = const AuthSuccess();
        return true;
      },
      (err) {
        state = AuthFailure(err.userMessage);
        return false;
      },
    );
  }

  void reset() => state = const AuthIdle();
}
