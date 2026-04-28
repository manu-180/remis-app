import 'package:remis_driver/features/ride/data/ride_model.dart';

class RideFactory {
  static Map<String, dynamic> _base({
    String id = 'ride-1',
    String status = 'requested',
    String passengerId = 'pax-1',
  }) =>
      {
        'id': id,
        'status': status,
        'pickup_address': 'Av. San Martín 123, Santa Rosa',
        'dest_address': 'Belgrano 456, Santa Rosa',
        'passenger_id': passengerId,
        'requested_at': '2026-01-01T10:00:00.000Z',
        'estimated_fare_ars': 1500.0,
        'notes': null,
        'driver_id': null,
      };

  static RideModel requested({String id = 'ride-1', String passengerId = 'pax-1'}) =>
      RideModel.fromMap(_base(id: id, passengerId: passengerId));

  static RideModel assigned({String id = 'ride-1', String driverId = 'driver-1'}) =>
      RideModel.fromMap({
        ..._base(id: id, status: 'assigned'),
        'driver_id': driverId,
        'assigned_at': '2026-01-01T10:01:00.000Z',
      });

  static RideModel enRouteToPickup({String id = 'ride-1', String driverId = 'driver-1'}) =>
      RideModel.fromMap({
        ..._base(id: id, status: 'en_route_to_pickup'),
        'driver_id': driverId,
        'assigned_at': '2026-01-01T10:01:00.000Z',
      });

  static RideModel onTrip({String id = 'ride-1', String driverId = 'driver-1'}) =>
      RideModel.fromMap({
        ..._base(id: id, status: 'on_trip'),
        'driver_id': driverId,
        'assigned_at': '2026-01-01T10:01:00.000Z',
        'started_at': '2026-01-01T10:10:00.000Z',
      });

  static RideModel completed({String id = 'ride-1', String driverId = 'driver-1'}) =>
      RideModel.fromMap({
        ..._base(id: id, status: 'completed'),
        'driver_id': driverId,
        'assigned_at': '2026-01-01T10:01:00.000Z',
        'started_at': '2026-01-01T10:10:00.000Z',
        'ended_at': '2026-01-01T10:30:00.000Z',
        'final_fare_ars': 1600.0,
        'distance_meters': 4200.0,
      });

  static RideModel cancelledByDriver({String id = 'ride-1'}) =>
      RideModel.fromMap({..._base(id: id, status: 'cancelled_by_driver')});
}
