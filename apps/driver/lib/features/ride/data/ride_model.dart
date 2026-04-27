import 'package:google_maps_flutter/google_maps_flutter.dart';

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

  static RideStatus fromString(String value) {
    switch (value) {
      case 'requested':
        return RideStatus.requested;
      case 'assigned':
        return RideStatus.assigned;
      case 'en_route_to_pickup':
        return RideStatus.enRouteToPickup;
      case 'waiting_passenger':
        return RideStatus.waitingPassenger;
      case 'on_trip':
        return RideStatus.onTrip;
      case 'completed':
        return RideStatus.completed;
      case 'cancelled_by_passenger':
        return RideStatus.cancelledByPassenger;
      case 'cancelled_by_driver':
        return RideStatus.cancelledByDriver;
      case 'cancelled_by_dispatcher':
        return RideStatus.cancelledByDispatcher;
      case 'no_show':
        return RideStatus.noShow;
      default:
        throw ArgumentError('Unknown ride status: $value');
    }
  }

  String get toDb {
    switch (this) {
      case RideStatus.requested:
        return 'requested';
      case RideStatus.assigned:
        return 'assigned';
      case RideStatus.enRouteToPickup:
        return 'en_route_to_pickup';
      case RideStatus.waitingPassenger:
        return 'waiting_passenger';
      case RideStatus.onTrip:
        return 'on_trip';
      case RideStatus.completed:
        return 'completed';
      case RideStatus.cancelledByPassenger:
        return 'cancelled_by_passenger';
      case RideStatus.cancelledByDriver:
        return 'cancelled_by_driver';
      case RideStatus.cancelledByDispatcher:
        return 'cancelled_by_dispatcher';
      case RideStatus.noShow:
        return 'no_show';
    }
  }

  bool get isActive {
    return this == RideStatus.requested ||
        this == RideStatus.assigned ||
        this == RideStatus.enRouteToPickup ||
        this == RideStatus.waitingPassenger ||
        this == RideStatus.onTrip;
  }

  bool get isTerminal {
    return this == RideStatus.completed ||
        this == RideStatus.cancelledByPassenger ||
        this == RideStatus.cancelledByDriver ||
        this == RideStatus.cancelledByDispatcher ||
        this == RideStatus.noShow;
  }
}

class RideModel {
  const RideModel({
    required this.id,
    required this.status,
    required this.pickupAddress,
    this.pickupLocation,
    required this.destAddress,
    this.destLocation,
    this.estimatedFareArs,
    this.finalFareArs,
    this.paymentMethod,
    this.notes,
    this.driverId,
    required this.passengerId,
    required this.requestedAt,
    this.assignedAt,
    this.pickupArrivedAt,
    this.startedAt,
    this.endedAt,
    this.distanceMeters,
  });

  final String id;
  final RideStatus status;
  final String pickupAddress;
  final LatLng? pickupLocation;
  final String destAddress;
  final LatLng? destLocation;
  final double? estimatedFareArs;
  final double? finalFareArs;
  final String? paymentMethod;
  final String? notes;
  final String? driverId;
  final String passengerId;
  final DateTime requestedAt;
  final DateTime? assignedAt;
  final DateTime? pickupArrivedAt;
  final DateTime? startedAt;
  final DateTime? endedAt;
  final double? distanceMeters;

  static LatLng? _parseWkt(String? wkt) {
    if (wkt == null) return null;
    final match = RegExp(r'POINT\(([^ ]+) ([^)]+)\)').firstMatch(wkt);
    if (match == null) return null;
    final lng = double.tryParse(match.group(1)!);
    final lat = double.tryParse(match.group(2)!);
    if (lng == null || lat == null) return null;
    return LatLng(lat, lng);
  }

  factory RideModel.fromMap(Map<String, dynamic> map) {
    return RideModel(
      id: map['id'] as String,
      status: RideStatus.fromString(map['status'] as String),
      pickupAddress: map['pickup_address'] as String,
      pickupLocation: _parseWkt(map['pickup_location'] as String?),
      destAddress: map['dest_address'] as String,
      destLocation: _parseWkt(map['dest_location'] as String?),
      estimatedFareArs: (map['estimated_fare_ars'] as num?)?.toDouble(),
      finalFareArs: (map['final_fare_ars'] as num?)?.toDouble(),
      paymentMethod: map['payment_method'] as String?,
      notes: map['notes'] as String?,
      driverId: map['driver_id'] as String?,
      passengerId: map['passenger_id'] as String,
      requestedAt: DateTime.parse(map['requested_at'] as String),
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

  RideModel copyWith({
    String? id,
    RideStatus? status,
    String? pickupAddress,
    LatLng? pickupLocation,
    String? destAddress,
    LatLng? destLocation,
    double? estimatedFareArs,
    double? finalFareArs,
    String? paymentMethod,
    String? notes,
    String? driverId,
    String? passengerId,
    DateTime? requestedAt,
    DateTime? assignedAt,
    DateTime? pickupArrivedAt,
    DateTime? startedAt,
    DateTime? endedAt,
    double? distanceMeters,
  }) {
    return RideModel(
      id: id ?? this.id,
      status: status ?? this.status,
      pickupAddress: pickupAddress ?? this.pickupAddress,
      pickupLocation: pickupLocation ?? this.pickupLocation,
      destAddress: destAddress ?? this.destAddress,
      destLocation: destLocation ?? this.destLocation,
      estimatedFareArs: estimatedFareArs ?? this.estimatedFareArs,
      finalFareArs: finalFareArs ?? this.finalFareArs,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      notes: notes ?? this.notes,
      driverId: driverId ?? this.driverId,
      passengerId: passengerId ?? this.passengerId,
      requestedAt: requestedAt ?? this.requestedAt,
      assignedAt: assignedAt ?? this.assignedAt,
      pickupArrivedAt: pickupArrivedAt ?? this.pickupArrivedAt,
      startedAt: startedAt ?? this.startedAt,
      endedAt: endedAt ?? this.endedAt,
      distanceMeters: distanceMeters ?? this.distanceMeters,
    );
  }
}
