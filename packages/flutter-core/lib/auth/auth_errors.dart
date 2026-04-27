export '../errors/app_error.dart' show AuthError;

enum AuthErrorCode {
  invalidPhone,
  invalidOtp,
  otpExpired,
  userNotFound,
  unknown,
}

extension AuthErrorCodeExt on AuthErrorCode {
  String get code => switch (this) {
        AuthErrorCode.invalidPhone => 'invalid_phone',
        AuthErrorCode.invalidOtp => 'invalid_otp',
        AuthErrorCode.otpExpired => 'otp_expired',
        AuthErrorCode.userNotFound => 'user_not_found',
        AuthErrorCode.unknown => 'unknown',
      };
}
