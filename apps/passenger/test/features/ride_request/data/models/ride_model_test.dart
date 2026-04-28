import 'package:flutter_test/flutter_test.dart';
import 'package:passenger/features/ride_request/data/models/ride_model.dart';

// Supabase returns geography as WKT: "SRID=4326;POINT(lng lat)"
const _pickupWkt = 'SRID=4326;POINT(-64.2667 -36.6167)'; // Santa Rosa, LP
const _destWkt   = 'SRID=4326;POINT(-64.2800 -36.6300)';

void main() {
  group('RideStatus.fromString', () {
    test('parses all known statuses', () {
      expect(RideStatus.fromString('requested'),               RideStatus.requested);
      expect(RideStatus.fromString('assigned'),                RideStatus.assigned);
      expect(RideStatus.fromString('en_route_to_pickup'),      RideStatus.enRouteToPickup);
      expect(RideStatus.fromString('waiting_passenger'),       RideStatus.waitingPassenger);
      expect(RideStatus.fromString('on_trip'),                 RideStatus.onTrip);
      expect(RideStatus.fromString('completed'),               RideStatus.completed);
      expect(RideStatus.fromString('cancelled_by_passenger'),  RideStatus.cancelledByPassenger);
      expect(RideStatus.fromString('cancelled_by_driver'),     RideStatus.cancelledByDriver);
      expect(RideStatus.fromString('cancelled_by_dispatcher'), RideStatus.cancelledByDispatcher);
      expect(RideStatus.fromString('no_show'),                 RideStatus.noShow);
    });

    test('unknown string falls back to requested', () {
      expect(RideStatus.fromString('bogus_status'), RideStatus.requested);
      expect(RideStatus.fromString(''),             RideStatus.requested);
    });
  });

  group('RideStatus.isActive', () {
    test('active statuses return true', () {
      for (final s in [
        RideStatus.requested,
        RideStatus.assigned,
        RideStatus.enRouteToPickup,
        RideStatus.waitingPassenger,
        RideStatus.onTrip,
      ]) {
        expect(s.isActive, isTrue, reason: '$s should be active');
      }
    });

    test('terminal statuses return false', () {
      for (final s in [
        RideStatus.completed,
        RideStatus.cancelledByPassenger,
        RideStatus.cancelledByDriver,
        RideStatus.cancelledByDispatcher,
        RideStatus.noShow,
      ]) {
        expect(s.isActive, isFalse, reason: '$s should not be active');
      }
    });
  });

  group('RideStatus.isTerminal', () {
    test('is the complement of isActive', () {
      for (final s in RideStatus.values) {
        expect(s.isTerminal, !s.isActive);
      }
    });
  });

  group('RideModel.fromMap', () {
    test('parses required fields', () {
      final map = {
        'id': 'ride-abc',
        'status': 'requested',
        'pickup_location': _pickupWkt,
      };
      final ride = RideModel.fromMap(map);
      expect(ride.id, 'ride-abc');
      expect(ride.status, RideStatus.requested);
      // Coordinates: lng=-64.2667, lat=-36.6167 — PostGIS stores (lng lat)
      expect(ride.pickupLocation.latitude,  closeTo(-36.6167, 0.0001));
      expect(ride.pickupLocation.longitude, closeTo(-64.2667, 0.0001));
    });

    test('parses optional address fields', () {
      final map = {
        'id': 'ride-1',
        'status': 'assigned',
        'pickup_location': _pickupWkt,
        'pickup_address': 'Av. San Martín 123, Santa Rosa',
        'dest_address': 'Belgrano 456, Santa Rosa',
        'dest_location': _destWkt,
      };
      final ride = RideModel.fromMap(map);
      expect(ride.pickupAddress, 'Av. San Martín 123, Santa Rosa');
      expect(ride.destAddress, 'Belgrano 456, Santa Rosa');
      expect(ride.destLocation, isNotNull);
      expect(ride.destLocation!.latitude,  closeTo(-36.6300, 0.0001));
      expect(ride.destLocation!.longitude, closeTo(-64.2800, 0.0001));
    });

    test('optional fields are null when absent', () {
      final map = {
        'id': 'ride-2',
        'status': 'completed',
        'pickup_location': _pickupWkt,
      };
      final ride = RideModel.fromMap(map);
      expect(ride.pickupAddress,    isNull);
      expect(ride.destAddress,      isNull);
      expect(ride.destLocation,     isNull);
      expect(ride.estimatedFareArs, isNull);
      expect(ride.finalFareArs,     isNull);
      expect(ride.paymentMethod,    isNull);
      expect(ride.notes,            isNull);
      expect(ride.driverId,         isNull);
      expect(ride.requestedAt,      isNull);
      expect(ride.assignedAt,       isNull);
      expect(ride.pickupArrivedAt,  isNull);
      expect(ride.startedAt,        isNull);
      expect(ride.endedAt,          isNull);
      expect(ride.distanceMeters,   isNull);
    });

    test('parses fare fields as double', () {
      final map = {
        'id': 'ride-3',
        'status': 'completed',
        'pickup_location': _pickupWkt,
        'estimated_fare_ars': 1500,
        'final_fare_ars': 1600.50,
        'distance_meters': 4200,
      };
      final ride = RideModel.fromMap(map);
      expect(ride.estimatedFareArs, isA<double>());
      expect(ride.estimatedFareArs, 1500.0);
      expect(ride.finalFareArs,     isA<double>());
      expect(ride.finalFareArs,     1600.50);
      expect(ride.distanceMeters,   isA<double>());
      expect(ride.distanceMeters,   4200.0);
    });

    test('parses datetime fields from ISO 8601 strings', () {
      final map = {
        'id': 'ride-4',
        'status': 'on_trip',
        'pickup_location': _pickupWkt,
        'requested_at':     '2026-01-01T10:00:00Z',
        'assigned_at':      '2026-01-01T10:02:00Z',
        'pickup_arrived_at':'2026-01-01T10:08:00Z',
        'started_at':       '2026-01-01T10:10:00Z',
        'ended_at':         '2026-01-01T10:30:00Z',
      };
      final ride = RideModel.fromMap(map);
      expect(ride.requestedAt,     DateTime.utc(2026, 1, 1, 10, 0, 0));
      expect(ride.assignedAt,      DateTime.utc(2026, 1, 1, 10, 2, 0));
      expect(ride.pickupArrivedAt, DateTime.utc(2026, 1, 1, 10, 8, 0));
      expect(ride.startedAt,       DateTime.utc(2026, 1, 1, 10, 10, 0));
      expect(ride.endedAt,         DateTime.utc(2026, 1, 1, 10, 30, 0));
    });

    test('parses payment_method and notes', () {
      final map = {
        'id': 'ride-5',
        'status': 'requested',
        'pickup_location': _pickupWkt,
        'payment_method': 'cash',
        'notes': 'Portón azul',
        'driver_id': 'driver-xyz',
      };
      final ride = RideModel.fromMap(map);
      expect(ride.paymentMethod, 'cash');
      expect(ride.notes, 'Portón azul');
      expect(ride.driverId, 'driver-xyz');
    });

    test('throws FormatException for missing pickup_location', () {
      final map = {'id': 'ride-6', 'status': 'requested'};
      expect(() => RideModel.fromMap(map), throwsA(isA<FormatException>()));
    });

    test('throws FormatException for malformed WKT', () {
      final map = {
        'id': 'ride-7',
        'status': 'requested',
        'pickup_location': 'NOT_A_WKT_STRING',
      };
      expect(() => RideModel.fromMap(map), throwsA(isA<FormatException>()));
    });
  });
}
