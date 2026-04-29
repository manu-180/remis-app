import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:remis_flutter_core/remis_flutter_core.dart';
import 'package:remis_driver/features/kyc/data/kyc_repository.dart';

part 'kyc_controller.g.dart';

sealed class KycUiState {
  const KycUiState();
}

final class KycIdle extends KycUiState {
  const KycIdle();
}

final class KycLoading extends KycUiState {
  const KycLoading();
}

final class KycPending extends KycUiState {
  const KycPending();
}

final class KycSuccess extends KycUiState {
  const KycSuccess();
}

final class KycFailure extends KycUiState {
  const KycFailure(this.message);
  final String message;
}

@riverpod
class KycController extends _$KycController {
  KycRepository get _repo => KycRepository(Supabase.instance.client);

  String get _uid => Supabase.instance.client.auth.currentUser!.id;

  @override
  KycUiState build() => const KycIdle();

  Future<void> createSession() async {
    state = const KycLoading();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('onboarding_completed', true);
    state = const KycSuccess();
  }

  Future<void> checkStatus() async {
    state = const KycLoading();
    final result = await _repo.checkKycStatus(_uid);
    result.fold(
      (approved) {
        if (approved) {
          state = const KycSuccess();
        } else {
          state = const KycFailure('Tu verificación aún no fue aprobada. Intentá de nuevo más tarde.');
        }
      },
      (err) => state = KycFailure(err.userMessage),
    );
  }

  void reset() => state = const KycIdle();
}
