import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'intra_shift_kyc_controller.g.dart';

sealed class IntraShiftKycState {
  const IntraShiftKycState();
}

final class IntraShiftKycIdle extends IntraShiftKycState {
  const IntraShiftKycIdle();
}

final class IntraShiftKycCapturing extends IntraShiftKycState {
  const IntraShiftKycCapturing();
}

final class IntraShiftKycUploading extends IntraShiftKycState {
  const IntraShiftKycUploading();
}

final class IntraShiftKycPassed extends IntraShiftKycState {
  const IntraShiftKycPassed();
}

final class IntraShiftKycFailed extends IntraShiftKycState {
  const IntraShiftKycFailed(this.similarity);
  final double similarity;
}

final class IntraShiftKycError extends IntraShiftKycState {
  const IntraShiftKycError(this.message);
  final String message;
}

@riverpod
class IntraShiftKycController extends _$IntraShiftKycController {
  @override
  IntraShiftKycState build() => const IntraShiftKycIdle();

  Future<void> runCheck(String driverId) async {
    state = const IntraShiftKycCapturing();
    await Future<void>.delayed(const Duration(milliseconds: 500));
    state = const IntraShiftKycUploading();
    await Future<void>.delayed(const Duration(milliseconds: 500));
    // TODO: integrate image_picker and kyc-compare-face Edge Function when image_picker is added to pubspec
    state = const IntraShiftKycPassed();
  }

  void reset() => state = const IntraShiftKycIdle();
}
