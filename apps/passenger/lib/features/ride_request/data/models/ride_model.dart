import 'package:google_maps_flutter/google_maps_flutter.dart';

import 'geo_utils.dart';

enum RideStatus {
  requested,
  assigned,
  enRouteToPickup,
  waitingPassenger,
  onTrip,
  completed,
  cancelledByPassenger,
  cancelledByDriver,
  cancelledByDispatcher,
  noShow;

  static RideStatus fromString(String s) => switch (s) {
        'requested'               => RideStatus.requested,
        'assigned'                => RideStatus.assigned,
        'en_route_to_pickup'      => RideStatus.enRouteToPickup,
        'waiting_passenger'       => RideStatus.waitingPassenger,
        'on_trip'                 => RideStatus.onTrip,
        'completed'               => RideStatus.completed,
        'cancelled_by_passenger'  => RideStatus.cancelledByPassenger,
        'cancelled_by_driver'     => RideStatus.cancelledByDriver,
        'cancelled_by_dispatcher' => RideStatus.cancelledByDispatcher,
        'no_show'                 => RideStatus.noShow,
        _                         => RideStatus.requested,
      };

  bool get isActive => switch (this) {
        RideStatus.requested ||
        RideStatus.assigned ||
        RideStatus.enRouteToPickup ||
        RideStatus.waitingPassenger ||
        RideStatus.onTrip =>
          true,
        _ => false,
      };

  bool get isTerminal => !isActive;
}

class RideModel {
  const RideModel({
    required this.id,
    required this.status,
    this.pickupAddress,
    required this.pickupLocation,
    this.destAddress,
    this.destLocation,
    this.estimatedFareArs,
    this.finalFareArs,
    this.paymentMethod,
    this.notes,
    this.driverId,
    this.requestedAt,
    this.assignedAt,
    this.pickupArrivedAt,
    this.startedAt,
    this.endedAt,
    this.distanceMeters,
  });

  final String id;
  final RideStatus status;
  final String? pickupAddress;
  final LatLng pickupLocation;
  final String? destAddress;
  final LatLng? destLocation;
  final double? estimatedFareArs;
  final double? finalFareArs;
  final String? paymentMethod;
  final String? notes;
  final String? driverId;
  final DateTime? requestedAt;
  final DateTime? assignedAt;
  final DateTime? pickupArrivedAt;
  final DateTime? startedAt;
  final DateTime? endedAt;
  final double? distanceMeters;

  factory RideModel.fromMap(Map<String, dynamic> map) {
    return RideModel(
      id: map['id'] as String,
      status: RideStatus.fromString(map['status'] as String? ?? 'requested'),
      pickupAddress: map['pickup_address'] as String?,
      pickupLocation: parseGeoPoint(map['pickup_location']),
      destAddress: map['dest_address'] as String?,
      destLocation: tryParseGeoPoint(map['dest_location']),
      estimatedFareArs: (map['estimated_fare_ars'] as num?)?.toDouble(),
      finalFareArs: (map['final_fare_ars'] as num?)?.toDouble(),
      paymentMethod: map['payment_method'] as String?,
      notes: map['notes'] as String?,
      driverId: map['driver_id'] as String?,
      requestedAt: map['requested_at'] != null
          ? DateTime.parse(map['requested_at'] as String)
          : null,
      assignedAt: map['assigned_at'] != null
          ? DateTime.parse(map['assigned_at'] as String)
          : null,
      pickupArrivedAt: map['pickup_arrived_at'] != null
          ? DateTime.parse(map['pickup_arrived_at'] as String)
          : null,
      startedAt: map['started_at'] != null
          ? DateTime.parse(map['started_at'] as String)
          : null,
      endedAt: map['ended_at'] != null
          ? DateTime.parse(map['ended_at'] as String)
          : null,
      distanceMeters: (map['distance_meters'] as num?)?.toDouble(),
    );
  }
}
