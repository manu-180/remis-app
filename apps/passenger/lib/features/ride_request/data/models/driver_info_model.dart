import 'package:google_maps_flutter/google_maps_flutter.dart';

class DriverInfoModel {
  const DriverInfoModel({
    required this.id,
    required this.fullName,
    required this.mobileNumber,
    required this.rating,
    this.plate,
    this.vehicleType,
    this.vehicleColor,
    this.location,
    this.heading,
  });

  final String id;
  final String fullName;
  final String mobileNumber;
  final double rating;
  final String? plate;
  final String? vehicleType;
  final String? vehicleColor;
  final LatLng? location;
  final double? heading;

  /// Parses a PostGIS WKT geography value: "SRID=4326;POINT(lng lat)"
  static LatLng? _parseGeo(dynamic val) {
    if (val == null) return null;
    final s = val.toString();
    final match = RegExp(r'POINT\(([^ ]+) ([^)]+)\)').firstMatch(s);
    if (match == null) return null;
    // PostGIS POINT stores (longitude latitude), so group(1)=lng, group(2)=lat
    return LatLng(double.parse(match.group(2)!), double.parse(match.group(1)!));
  }

  /// Builds from a flat row from the `driver_current_location` stream.
  /// Also works for the nested join result from `getDriverInfo` by accepting
  /// pre-extracted sub-maps via the named fields.
  factory DriverInfoModel.fromMap(Map<String, dynamic> map) {
    // Flat stream from driver_current_location: driver_id, location, heading
    // Nested join from drivers query: id, mobile_number, rating,
    //   profiles: {full_name}, vehicles: {plate, vehicle_type, color},
    //   driver_current_location: {location, heading}
    final profile = map['profiles'] as Map<String, dynamic>?;
    final vehicle = map['vehicles'] as Map<String, dynamic>?;
    final locMap = map['driver_current_location'] as Map<String, dynamic>?;

    // Resolve driver id — flat stream uses 'driver_id', join uses 'id'
    final id = map['driver_id'] as String? ?? map['id'] as String;

    // Resolve location — may come from nested locMap or flat 'location' field
    final rawLocation = locMap != null ? locMap['location'] : map['location'];
    final rawHeading = locMap != null ? locMap['heading'] : map['heading'];

    return DriverInfoModel(
      id: id,
      fullName: profile?['full_name'] as String? ??
          map['full_name'] as String? ??
          'Conductor',
      mobileNumber: map['mobile_number'] as String? ?? '',
      rating: (map['rating'] as num?)?.toDouble() ?? 5.0,
      plate: vehicle?['plate'] as String? ?? map['plate'] as String?,
      vehicleType: vehicle?['vehicle_type'] as String? ??
          map['vehicle_type'] as String?,
      vehicleColor:
          vehicle?['color'] as String? ?? map['color'] as String?,
      location: _parseGeo(rawLocation),
      heading: (rawHeading as num?)?.toDouble(),
    );
  }

  DriverInfoModel copyWith({LatLng? location, double? heading}) {
    return DriverInfoModel(
      id: id,
      fullName: fullName,
      mobileNumber: mobileNumber,
      rating: rating,
      plate: plate,
      vehicleType: vehicleType,
      vehicleColor: vehicleColor,
      location: location ?? this.location,
      heading: heading ?? this.heading,
    );
  }
}
