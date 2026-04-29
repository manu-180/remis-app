import 'dart:typed_data';

import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Parses a PostGIS geometry value to [LatLng].
///
/// Supabase returns geography columns as WKB hex after INSERT/SELECT.
/// Direct .stream() calls may return WKT ("SRID=4326;POINT(lng lat)").
/// This function handles both formats transparently.
LatLng parseGeoPoint(dynamic val) {
  if (val == null) throw const FormatException('Missing required location field');
  final s = val.toString();
  final match = RegExp(r'POINT\(([^ ]+) ([^)]+)\)').firstMatch(s);
  if (match != null) {
    // PostGIS POINT stores (longitude latitude)
    return LatLng(double.parse(match.group(2)!), double.parse(match.group(1)!));
  }
  if (_looksLikeHex(s)) return _parseWkbPoint(s);
  throw FormatException('Cannot parse geometry location: $s');
}

/// Nullable variant — returns null if val is null or unparseable.
LatLng? tryParseGeoPoint(dynamic val) {
  if (val == null) return null;
  try {
    return parseGeoPoint(val);
  } catch (_) {
    return null;
  }
}

bool _looksLikeHex(String s) =>
    s.length >= 42 && RegExp(r'^[0-9a-fA-F]+$').hasMatch(s);

/// Decodes an EWKB hex-encoded point (little- or big-endian, with or without SRID).
LatLng _parseWkbPoint(String hex) {
  final bytes = Uint8List.fromList(
    List.generate(
      hex.length ~/ 2,
      (i) => int.parse(hex.substring(i * 2, i * 2 + 2), radix: 16),
    ),
  );
  final data = ByteData.sublistView(bytes);
  final isLE = bytes[0] == 1;
  final type = isLE
      ? data.getUint32(1, Endian.little)
      : data.getUint32(1, Endian.big);
  final hasSrid = (type & 0x20000000) != 0;
  final offset = 5 + (hasSrid ? 4 : 0);
  final x = isLE
      ? data.getFloat64(offset, Endian.little)
      : data.getFloat64(offset, Endian.big);
  final y = isLE
      ? data.getFloat64(offset + 8, Endian.little)
      : data.getFloat64(offset + 8, Endian.big);
  return LatLng(y, x); // PostGIS: x=longitude, y=latitude
}
