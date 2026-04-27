// ignore_for_file: avoid_print
import 'dart:developer' as dev;

enum LogLevel { debug, info, warning, error }

void log(
  String message, {
  LogLevel level = LogLevel.info,
  Object? error,
  StackTrace? stackTrace,
  String? tag,
}) {
  assert(() {
    final prefix = tag != null ? '[$tag] ' : '';
    dev.log(
      '$prefix$message',
      name: 'passenger.${level.name}',
      error: error,
      stackTrace: stackTrace,
      level: _levelValue(level),
    );
    return true;
  }());
}

int _levelValue(LogLevel level) => switch (level) {
      LogLevel.debug => 500,
      LogLevel.info => 800,
      LogLevel.warning => 900,
      LogLevel.error => 1000,
    };
