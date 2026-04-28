// Tests for the ShiftState sealed class hierarchy.
// Pure data — no Supabase, no network.

import 'package:flutter_test/flutter_test.dart';
import 'package:remis_driver/features/shift/presentation/providers/shift_controller.dart';
import 'package:remis_driver/shared/widgets/driver_status_pill.dart';

void main() {
  // ─── Type identity ───────────────────────────────────────────────────────────
  group('ShiftState type identity', () {
    test('ShiftIdle is a ShiftState', () {
      expect(const ShiftIdle(), isA<ShiftState>());
    });

    test('ShiftLoading is a ShiftState', () {
      expect(const ShiftLoading(), isA<ShiftState>());
    });

    test('ShiftActive is a ShiftState', () {
      expect(ShiftActive(DriverStatus.available), isA<ShiftState>());
    });

    test('ShiftError is a ShiftState', () {
      expect(const ShiftError('oops'), isA<ShiftState>());
    });

    test('all four states are distinct runtime types', () {
      final states = <ShiftState>[
        const ShiftIdle(),
        const ShiftLoading(),
        ShiftActive(DriverStatus.available),
        const ShiftError('msg'),
      ];
      final types = states.map((s) => s.runtimeType).toSet();
      expect(types.length, 4);
    });
  });

  // ─── ShiftIdle ───────────────────────────────────────────────────────────────
  group('ShiftIdle', () {
    test('const constructor works', () {
      expect(const ShiftIdle(), isA<ShiftIdle>());
    });

    test('two ShiftIdle instances are equal (const)', () {
      const a = ShiftIdle();
      const b = ShiftIdle();
      // Dart const objects are canonicalized — identical check suffices.
      expect(identical(a, b), true);
    });
  });

  // ─── ShiftLoading ────────────────────────────────────────────────────────────
  group('ShiftLoading', () {
    test('const constructor works', () {
      expect(const ShiftLoading(), isA<ShiftLoading>());
    });
  });

  // ─── ShiftActive ─────────────────────────────────────────────────────────────
  group('ShiftActive', () {
    test('holds DriverStatus.available', () {
      final state = ShiftActive(DriverStatus.available);
      expect(state.status, DriverStatus.available);
    });

    test('holds DriverStatus.onBreak', () {
      final state = ShiftActive(DriverStatus.onBreak);
      expect(state.status, DriverStatus.onBreak);
    });

    test('holds DriverStatus.enRoute', () {
      final state = ShiftActive(DriverStatus.enRoute);
      expect(state.status, DriverStatus.enRoute);
    });

    test('holds DriverStatus.waiting', () {
      final state = ShiftActive(DriverStatus.waiting);
      expect(state.status, DriverStatus.waiting);
    });

    test('holds DriverStatus.onTrip', () {
      final state = ShiftActive(DriverStatus.onTrip);
      expect(state.status, DriverStatus.onTrip);
    });

    test('two ShiftActive with same status have same status value', () {
      final a = ShiftActive(DriverStatus.available);
      final b = ShiftActive(DriverStatus.available);
      expect(a.status, b.status);
    });

    test('two ShiftActive with different status differ', () {
      final a = ShiftActive(DriverStatus.available);
      final b = ShiftActive(DriverStatus.onBreak);
      expect(a.status, isNot(b.status));
    });
  });

  // ─── ShiftError ──────────────────────────────────────────────────────────────
  group('ShiftError', () {
    test('holds the error message', () {
      const state = ShiftError('No se pudo iniciar el turno.');
      expect(state.message, 'No se pudo iniciar el turno.');
    });

    test('holds an empty message', () {
      const state = ShiftError('');
      expect(state.message, '');
    });

    test('two ShiftError instances with same message have equal messages', () {
      const a = ShiftError('error');
      const b = ShiftError('error');
      expect(a.message, b.message);
    });

    test('two ShiftError instances with different messages differ', () {
      const a = ShiftError('error A');
      const b = ShiftError('error B');
      expect(a.message, isNot(b.message));
    });
  });

  // ─── Pattern matching (sealed exhaustiveness) ────────────────────────────────
  group('ShiftState pattern matching', () {
    String _describe(ShiftState s) => switch (s) {
          ShiftIdle() => 'idle',
          ShiftLoading() => 'loading',
          ShiftActive(:final status) => 'active:${status.name}',
          ShiftError(:final message) => 'error:$message',
        };

    test('ShiftIdle describes as idle', () {
      expect(_describe(const ShiftIdle()), 'idle');
    });

    test('ShiftLoading describes as loading', () {
      expect(_describe(const ShiftLoading()), 'loading');
    });

    test('ShiftActive describes with status', () {
      expect(_describe(ShiftActive(DriverStatus.available)), 'active:available');
    });

    test('ShiftError describes with message', () {
      expect(_describe(const ShiftError('boom')), 'error:boom');
    });
  });
}
