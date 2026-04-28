import 'dart:convert';

import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:http/http.dart' as http;

import '../models/route_result.dart';

/// Wraps the Google Directions API for the passenger app.
class DirectionsService {
  DirectionsService({required http.Client httpClient, required String apiKey})
      : _client = httpClient,
        _apiKey = apiKey;

  final http.Client _client;
  final String _apiKey;

  static const _host = 'maps.googleapis.com';
  static const _path = '/maps/api/directions/json';

  Future<RouteResult> route(LatLng origin, LatLng destination) async {
    final uri = Uri.https(_host, _path, {
      'origin': '${origin.latitude},${origin.longitude}',
      'destination': '${destination.latitude},${destination.longitude}',
      'mode': 'driving',
      'language': 'es',
      'key': _apiKey,
    });
    final res = await _client.get(uri);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw DirectionsException('HTTP_${res.statusCode}', res.body);
    }
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    return RouteResult.fromDirectionsJson(body);
  }
}
