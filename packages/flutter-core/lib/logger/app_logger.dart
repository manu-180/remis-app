import 'dart:developer' as dev;

enum LogLevel { debug, info, warning, error }

class AppLogger {
  const AppLogger(this._tag);
  final String _tag;

  void debug(String message, {Object? error}) =>
      _log(LogLevel.debug, message, error: error);

  void info(String message, {Object? error}) =>
      _log(LogLevel.info, message, error: error);

  void warning(String message, {Object? error}) =>
      _log(LogLevel.warning, message, error: error);

  void error(String message, {Object? error, StackTrace? stackTrace}) =>
      _log(LogLevel.error, message, error: error, stackTrace: stackTrace);

  void _log(
    LogLevel level,
    String message, {
    Object? error,
    StackTrace? stackTrace,
  }) {
    final prefix = switch (level) {
      LogLevel.debug => '[DEBUG]',
      LogLevel.info => '[INFO]',
      LogLevel.warning => '[WARN]',
      LogLevel.error => '[ERROR]',
    };
    dev.log(
      '$prefix [$_tag] $message',
      name: 'remis',
      error: error,
      stackTrace: stackTrace,
    );
  }
}

// Tanda 5A will connect this to Sentry
AppLogger logger(String tag) => AppLogger(tag);
