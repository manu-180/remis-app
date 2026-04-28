import 'dart:convert';

import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:http/http.dart' as http;

import '../models/place_prediction.dart';

/// Wraps Google Places Autocomplete + Place Details endpoints.
///
/// Argentina-only (`components=country:ar`). Language `es`. Optional
/// [locationBias] biases results around a center with a 50 km radius.
class PlacesService {
  PlacesService({required http.Client httpClient, required String apiKey})
      : _client = httpClient,
        _apiKey = apiKey;

  final http.Client _client;
  final String _apiKey;

  static const _autocompletePath = '/maps/api/place/autocomplete/json';
  static const _detailsPath = '/maps/api/place/details/json';
  static const _host = 'maps.googleapis.com';

  Future<List<PlacePrediction>> autocomplete(
    String query, {
    LatLng? locationBias,
  }) async {
    final params = <String, String>{
      'input': query,
      'components': 'country:ar',
      'language': 'es',
      'key': _apiKey,
    };
    if (locationBias != null) {
      params['location'] =
          '${locationBias.latitude},${locationBias.longitude}';
      params['radius'] = '50000';
    }
    final uri = Uri.https(_host, _autocompletePath, params);
    final body = await _request(uri);
    final status = body['status'] as String?;
    if (status == 'ZERO_RESULTS') return const [];
    if (status != 'OK') {
      throw PlacesException(
          status ?? 'UNKNOWN', body['error_message']?.toString() ?? '');
    }
    final list =
        (body['predictions'] as List? ?? const []).cast<Map<String, dynamic>>();
    return list.map(PlacePrediction.fromJson).toList();
  }

  Future<LatLng> details(String placeId) async {
    final uri = Uri.https(_host, _detailsPath, {
      'place_id': placeId,
      'fields': 'geometry',
      'language': 'es',
      'key': _apiKey,
    });
    final body = await _request(uri);
    final status = body['status'] as String?;
    if (status != 'OK') {
      throw PlacesException(
          status ?? 'UNKNOWN', body['error_message']?.toString() ?? '');
    }
    final loc =
        (body['result'] as Map<String, dynamic>)['geometry']['location']
            as Map<String, dynamic>;
    return LatLng(
        (loc['lat'] as num).toDouble(), (loc['lng'] as num).toDouble());
  }

  Future<Map<String, dynamic>> _request(Uri uri) async {
    final res = await _client.get(uri);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw PlacesException('HTTP_${res.statusCode}', res.body);
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }
}

class PlacesException implements Exception {
  PlacesException(this.status, this.message);
  final String status;
  final String message;
  @override
  String toString() => 'PlacesException($status): $message';
}
