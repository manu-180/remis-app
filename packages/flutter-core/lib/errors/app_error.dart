sealed class AppError {
  const AppError();
  String get userMessage;
}

final class NetworkError extends AppError {
  const NetworkError({this.cause});
  final Object? cause;
  @override
  String get userMessage => 'Sin conexión. Revisá tu internet y volvé a intentar.';
}

final class AuthError extends AppError {
  const AuthError({required this.code, this.cause});
  final String code;
  final Object? cause;
  @override
  String get userMessage => switch (code) {
        'invalid_phone' => 'El teléfono ingresado no es válido.',
        'invalid_otp' => 'El código es incorrecto. Revisalo e intentá de nuevo.',
        'otp_expired' => 'El código expiró. Pedí uno nuevo.',
        'user_not_found' => 'Este número no está registrado como conductor.',
        _ => 'Error de autenticación. Intentá de nuevo.',
      };
}

final class PermissionError extends AppError {
  const PermissionError({required this.permission});
  final String permission;
  @override
  String get userMessage =>
      'Para usar esta función necesitás conceder el permiso de $permission.';
}

final class ValidationError extends AppError {
  const ValidationError({required this.field, required this.message});
  final String field;
  final String message;
  @override
  String get userMessage => message;
}

final class DomainError extends AppError {
  const DomainError({required this.message});
  final String message;
  @override
  String get userMessage => message;
}

final class UnknownError extends AppError {
  const UnknownError({this.cause});
  final Object? cause;
  @override
  String get userMessage =>
      'Algo salió mal. Intentá de nuevo o comunicate con soporte.';
}
