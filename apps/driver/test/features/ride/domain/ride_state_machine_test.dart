// Tests for RideStatus properties and RideModel parsing.
// No Supabase, no network — pure domain logic.

import 'package:flutter_test/flutter_test.dart';
import 'package:remis_driver/features/ride/data/ride_model.dart';
import '../../../factories/ride_factory.dart';

void main() {
  // ─── RideStatus.isActive ────────────────────────────────────────────────────
  group('RideStatus.isActive', () {
    test('requested is active', () => expect(RideStatus.requested.isActive, true));
    test('assigned is active', () => expect(RideStatus.assigned.isActive, true));
    test('enRouteToPickup is active', () => expect(RideStatus.enRouteToPickup.isActive, true));
    test('waitingPassenger is active', () => expect(RideStatus.waitingPassenger.isActive, true));
    test('onTrip is active', () => expect(RideStatus.onTrip.isActive, true));

    test('completed is NOT active', () => expect(RideStatus.completed.isActive, false));
    test('cancelledByPassenger is NOT active', () => expect(RideStatus.cancelledByPassenger.isActive, false));
    test('cancelledByDriver is NOT active', () => expect(RideStatus.cancelledByDriver.isActive, false));
    test('cancelledByDispatcher is NOT active', () => expect(RideStatus.cancelledByDispatcher.isActive, false));
    test('noShow is NOT active', () => expect(RideStatus.noShow.isActive, false));
  });

  // ─── RideStatus.isTerminal ──────────────────────────────────────────────────
  group('RideStatus.isTerminal', () {
    test('completed is terminal', () => expect(RideStatus.completed.isTerminal, true));
    test('cancelledByPassenger is terminal', () => expect(RideStatus.cancelledByPassenger.isTerminal, true));
    test('cancelledByDriver is terminal', () => expect(RideStatus.cancelledByDriver.isTerminal, true));
    test('cancelledByDispatcher is terminal', () => expect(RideStatus.cancelledByDispatcher.isTerminal, true));
    test('noShow is terminal', () => expect(RideStatus.noShow.isTerminal, true));

    test('requested is NOT terminal', () => expect(RideStatus.requested.isTerminal, false));
    test('assigned is NOT terminal', () => expect(RideStatus.assigned.isTerminal, false));
    test('enRouteToPickup is NOT terminal', () => expect(RideStatus.enRouteToPickup.isTerminal, false));
    test('waitingPassenger is NOT terminal', () => expect(RideStatus.waitingPassenger.isTerminal, false));
    test('onTrip is NOT terminal', () => expect(RideStatus.onTrip.isTerminal, false));
  });

  // ─── Active and terminal are mutually exclusive ──────────────────────────────
  group('RideStatus active/terminal mutual exclusion', () {
    test('no status is both active and terminal', () {
      for (final s in RideStatus.values) {
        expect(
          s.isActive && s.isTerminal,
          false,
          reason: '$s must not be both active and terminal',
        );
      }
    });

    test('every status is either active or terminal', () {
      for (final s in RideStatus.values) {
        expect(
          s.isActive || s.isTerminal,
          true,
          reason: '$s must be either active or terminal',
        );
      }
    });
  });

  // ─── RideStatus.fromString ──────────────────────────────────────────────────
  group('RideStatus.fromString', () {
    test('parses requested', () => expect(RideStatus.fromString('requested'), RideStatus.requested));
    test('parses assigned', () => expect(RideStatus.fromString('assigned'), RideStatus.assigned));
    test('parses en_route_to_pickup', () => expect(RideStatus.fromString('en_route_to_pickup'), RideStatus.enRouteToPickup));
    test('parses waiting_passenger', () => expect(RideStatus.fromString('waiting_passenger'), RideStatus.waitingPassenger));
    test('parses on_trip', () => expect(RideStatus.fromString('on_trip'), RideStatus.onTrip));
    test('parses completed', () => expect(RideStatus.fromString('completed'), RideStatus.completed));
    test('parses cancelled_by_passenger', () => expect(RideStatus.fromString('cancelled_by_passenger'), RideStatus.cancelledByPassenger));
    test('parses cancelled_by_driver', () => expect(RideStatus.fromString('cancelled_by_driver'), RideStatus.cancelledByDriver));
    test('parses cancelled_by_dispatcher', () => expect(RideStatus.fromString('cancelled_by_dispatcher'), RideStatus.cancelledByDispatcher));
    test('parses no_show', () => expect(RideStatus.fromString('no_show'), RideStatus.noShow));

    test('unknown string throws ArgumentError', () {
      expect(() => RideStatus.fromString('invalid'), throwsArgumentError);
    });

    test('empty string throws ArgumentError', () {
      expect(() => RideStatus.fromString(''), throwsArgumentError);
    });

    test('camelCase throws ArgumentError (must use snake_case)', () {
      expect(() => RideStatus.fromString('enRouteToPickup'), throwsArgumentError);
    });
  });

  // ─── RideStatus.toDb ────────────────────────────────────────────────────────
  group('RideStatus.toDb', () {
    test('requested serializes correctly', () => expect(RideStatus.requested.toDb, 'requested'));
    test('assigned serializes correctly', () => expect(RideStatus.assigned.toDb, 'assigned'));
    test('enRouteToPickup serializes correctly', () => expect(RideStatus.enRouteToPickup.toDb, 'en_route_to_pickup'));
    test('waitingPassenger serializes correctly', () => expect(RideStatus.waitingPassenger.toDb, 'waiting_passenger'));
    test('onTrip serializes correctly', () => expect(RideStatus.onTrip.toDb, 'on_trip'));
    test('completed serializes correctly', () => expect(RideStatus.completed.toDb, 'completed'));
    test('cancelledByPassenger serializes correctly', () => expect(RideStatus.cancelledByPassenger.toDb, 'cancelled_by_passenger'));
    test('cancelledByDriver serializes correctly', () => expect(RideStatus.cancelledByDriver.toDb, 'cancelled_by_driver'));
    test('cancelledByDispatcher serializes correctly', () => expect(RideStatus.cancelledByDispatcher.toDb, 'cancelled_by_dispatcher'));
    test('noShow serializes correctly', () => expect(RideStatus.noShow.toDb, 'no_show'));
  });

  // ─── fromString / toDb round-trip ───────────────────────────────────────────
  group('RideStatus round-trip (fromString → toDb)', () {
    test('all statuses survive a toDb → fromString round-trip', () {
      for (final s in RideStatus.values) {
        expect(
          RideStatus.fromString(s.toDb),
          s,
          reason: '$s round-trip failed',
        );
      }
    });
  });

  // ─── RideModel.fromMap ──────────────────────────────────────────────────────
  group('RideModel.fromMap', () {
    Map<String, dynamic> _base() => {
          'id': 'abc',
          'status': 'requested',
          'pickup_address': 'Av. San Martín 123',
          'dest_address': 'Belgrano 456',
          'passenger_id': 'pax-1',
          'requested_at': '2026-01-01T00:00:00.000Z',
        };

    test('parses required fields', () {
      final m = RideModel.fromMap(_base());
      expect(m.id, 'abc');
      expect(m.status, RideStatus.requested);
      expect(m.pickupAddress, 'Av. San Martín 123');
      expect(m.destAddress, 'Belgrano 456');
      expect(m.passengerId, 'pax-1');
      expect(m.requestedAt, DateTime.utc(2026, 1, 1));
    });

    test('nullable optional fields default to null', () {
      final m = RideModel.fromMap(_base());
      expect(m.pickupLocation, isNull);
      expect(m.destLocation, isNull);
      expect(m.estimatedFareArs, isNull);
      expect(m.finalFareArs, isNull);
      expect(m.paymentMethod, isNull);
      expect(m.notes, isNull);
      expect(m.driverId, isNull);
      expect(m.assignedAt, isNull);
      expect(m.pickupArrivedAt, isNull);
      expect(m.startedAt, isNull);
      expect(m.endedAt, isNull);
      expect(m.distanceMeters, isNull);
    });

    test('WKT POINT parses pickup_location correctly', () {
      final map = {
        ..._base(),
        'pickup_location': 'POINT(-63.99 -38.71)',
      };
      final m = RideModel.fromMap(map);
      expect(m.pickupLocation, isNotNull);
      expect(m.pickupLocation!.latitude, closeTo(-38.71, 0.001));
      expect(m.pickupLocation!.longitude, closeTo(-63.99, 0.001));
    });

    test('WKT POINT parses dest_location correctly', () {
      final map = {
        ..._base(),
        'dest_location': 'POINT(-64.10 -38.80)',
      };
      final m = RideModel.fromMap(map);
      expect(m.destLocation, isNotNull);
      expect(m.destLocation!.latitude, closeTo(-38.80, 0.001));
      expect(m.destLocation!.longitude, closeTo(-64.10, 0.001));
    });

    test('null WKT returns null pickup_location', () {
      final m = RideModel.fromMap(_base());
      expect(m.pickupLocation, isNull);
    });

    test('parses estimated_fare_ars as double', () {
      final map = {..._base(), 'estimated_fare_ars': 1500};
      expect(RideModel.fromMap(map).estimatedFareArs, 1500.0);
    });

    test('parses estimated_fare_ars from double literal', () {
      final map = {..._base(), 'estimated_fare_ars': 1500.5};
      expect(RideModel.fromMap(map).estimatedFareArs, closeTo(1500.5, 0.001));
    });

    test('parses assigned status', () {
      final map = {..._base(), 'status': 'assigned'};
      expect(RideModel.fromMap(map).status, RideStatus.assigned);
    });

    test('parses on_trip status', () {
      final map = {..._base(), 'status': 'on_trip'};
      expect(RideModel.fromMap(map).status, RideStatus.onTrip);
    });

    test('parses optional datetime fields', () {
      final map = {
        ..._base(),
        'assigned_at': '2026-01-01T01:00:00.000Z',
        'started_at': '2026-01-01T02:00:00.000Z',
        'ended_at': '2026-01-01T03:00:00.000Z',
      };
      final m = RideModel.fromMap(map);
      expect(m.assignedAt, DateTime.utc(2026, 1, 1, 1));
      expect(m.startedAt, DateTime.utc(2026, 1, 1, 2));
      expect(m.endedAt, DateTime.utc(2026, 1, 1, 3));
    });

    test('parses driver_id and notes', () {
      final map = {
        ..._base(),
        'driver_id': 'drv-99',
        'notes': 'Pasajero con bastón',
      };
      final m = RideModel.fromMap(map);
      expect(m.driverId, 'drv-99');
      expect(m.notes, 'Pasajero con bastón');
    });

    test('copyWith preserves unchanged fields', () {
      final original = RideModel.fromMap({..._base(), 'status': 'requested'});
      final updated = original.copyWith(status: RideStatus.assigned);
      expect(updated.status, RideStatus.assigned);
      expect(updated.id, original.id);
      expect(updated.pickupAddress, original.pickupAddress);
    });
  });

  // ─── RideFactory helpers (validate factory assumptions) ─────────────────────
  group('RideFactory', () {
    test('requested() creates a requested active ride', () {
      final ride = RideFactory.requested();
      expect(ride.status, RideStatus.requested);
      expect(ride.status.isActive, true);
    });

    test('assigned() creates an assigned active ride with driverId', () {
      final ride = RideFactory.assigned(driverId: 'drv-42');
      expect(ride.status, RideStatus.assigned);
      expect(ride.driverId, 'drv-42');
      expect(ride.status.isActive, true);
    });

    test('enRouteToPickup() creates an enRoute active ride', () {
      final ride = RideFactory.enRouteToPickup();
      expect(ride.status, RideStatus.enRouteToPickup);
      expect(ride.status.isActive, true);
    });

    test('onTrip() creates an active on-trip ride', () {
      final ride = RideFactory.onTrip();
      expect(ride.status, RideStatus.onTrip);
      expect(ride.status.isActive, true);
      expect(ride.startedAt, isNotNull);
    });

    test('completed() creates a terminal ride with fare and distance', () {
      final ride = RideFactory.completed();
      expect(ride.status, RideStatus.completed);
      expect(ride.status.isTerminal, true);
      expect(ride.finalFareArs, 1600.0);
      expect(ride.distanceMeters, 4200.0);
    });

    test('cancelledByDriver() creates a terminal cancelled ride', () {
      final ride = RideFactory.cancelledByDriver();
      expect(ride.status, RideStatus.cancelledByDriver);
      expect(ride.status.isTerminal, true);
    });
  });
}
