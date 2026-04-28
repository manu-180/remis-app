import 'package:passenger/features/ride_request/data/models/ride_model.dart';

/// Test data factory for [RideModel].
///
/// Produces raw [Map] fixtures that mirror what Supabase returns.
/// Geography fields use PostGIS WKT format: "SRID=4326;POINT(lng lat)".
class RideFactory {
  RideFactory._();

  // Santa Rosa, La Pampa reference coordinates
  static const _pickupWkt = 'SRID=4326;POINT(-64.2667 -36.6167)';
  static const _destWkt   = 'SRID=4326;POINT(-64.2800 -36.6300)';

  /// A ride in [RideStatus.requested] state — driver not yet assigned.
  static Map<String, dynamic> requestedMap({
    String id = 'ride-1',
    String passengerId = 'pax-1',
  }) =>
      {
        'id': id,
        'status': 'requested',
        'pickup_address': 'Av. San Martín 123, Santa Rosa',
        'pickup_location': _pickupWkt,
        'dest_address': 'Belgrano 456, Santa Rosa',
        'dest_location': _destWkt,
        'passenger_id': passengerId,
        'requested_at': '2026-01-01T10:00:00Z',
        'estimated_fare_ars': 1500.0,
        'payment_method': 'cash',
      };

  /// A fully [RideStatus.completed] ride with final fare and distance.
  static Map<String, dynamic> completedMap({
    String id = 'ride-2',
    String passengerId = 'pax-1',
  }) =>
      {
        ...requestedMap(id: id, passengerId: passengerId),
        'status': 'completed',
        'driver_id': 'driver-1',
        'assigned_at':       '2026-01-01T10:02:00Z',
        'pickup_arrived_at': '2026-01-01T10:08:00Z',
        'started_at':        '2026-01-01T10:10:00Z',
        'ended_at':          '2026-01-01T10:30:00Z',
        'final_fare_ars': 1600.0,
        'distance_meters': 4200.0,
      };

  /// A ride cancelled by the passenger.
  static Map<String, dynamic> cancelledByPassengerMap({
    String id = 'ride-3',
    String passengerId = 'pax-1',
  }) =>
      {
        ...requestedMap(id: id, passengerId: passengerId),
        'status': 'cancelled_by_passenger',
      };

  /// Convenience: build a [RideModel] directly from [requestedMap].
  static RideModel requested({
    String id = 'ride-1',
    String passengerId = 'pax-1',
  }) =>
      RideModel.fromMap(requestedMap(id: id, passengerId: passengerId));

  /// Convenience: build a [RideModel] directly from [completedMap].
  static RideModel completed({
    String id = 'ride-2',
    String passengerId = 'pax-1',
  }) =>
      RideModel.fromMap(completedMap(id: id, passengerId: passengerId));
}
