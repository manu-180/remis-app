import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

/// Pumps [widget] inside a [ProviderScope] + [MaterialApp].
///
/// Use [overrides] to inject fake providers, e.g.:
/// ```dart
/// await pumpRiverpodWidget(tester, MyWidget(), overrides: [
///   myProvider.overrideWithValue(fakeValue),
/// ]);
/// ```
Future<void> pumpRiverpodWidget(
  WidgetTester tester,
  Widget widget, {
  List<Override> overrides = const [],
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: overrides,
      child: MaterialApp(home: widget),
    ),
  );
}
