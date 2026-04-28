import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:http/http.dart' as http;
import 'package:mocktail/mocktail.dart';
import 'package:passenger/features/ride_request/data/models/route_result.dart';
import 'package:passenger/features/ride_request/data/services/directions_service.dart';

class _MockClient extends Mock implements http.Client {}

void main() {
  late _MockClient client;
  late DirectionsService service;

  setUpAll(() {
    registerFallbackValue(Uri.parse('https://example.com'));
  });

  setUp(() {
    client = _MockClient();
    service = DirectionsService(httpClient: client, apiKey: 'TEST_KEY');
  });

  group('route', () {
    test('builds URL with origin, destination, mode=driving, lang=es, key', () async {
      when(() => client.get(any())).thenAnswer(
        (_) async => http.Response(
          jsonEncode({
            'status': 'OK',
            'routes': [
              {
                'overview_polyline': {'points': 'a~l~Fjk~uOwHJy@P'},
                'legs': [
                  {'distance': {'value': 100}, 'duration': {'value': 60}}
                ],
              }
            ],
          }),
          200,
        ),
      );
      await service.route(
        const LatLng(-36.6, -64.28),
        const LatLng(-36.61, -64.29),
      );
      final captured =
          verify(() => client.get(captureAny())).captured.single as Uri;
      expect(captured.host, 'maps.googleapis.com');
      expect(captured.path, '/maps/api/directions/json');
      expect(captured.queryParameters['origin'], '-36.6,-64.28');
      expect(captured.queryParameters['destination'], '-36.61,-64.29');
      expect(captured.queryParameters['mode'], 'driving');
      expect(captured.queryParameters['language'], 'es');
      expect(captured.queryParameters['key'], 'TEST_KEY');
    });

    test('returns RouteResult with decoded polyline + distance + duration',
        () async {
      when(() => client.get(any())).thenAnswer(
        (_) async => http.Response(
          jsonEncode({
            'status': 'OK',
            'routes': [
              {
                'overview_polyline': {'points': '_p~iF~ps|U_ulLnnqC_mqNvxq`@'},
                'legs': [
                  {'distance': {'value': 3500}, 'duration': {'value': 720}}
                ],
              }
            ],
          }),
          200,
        ),
      );
      final r = await service.route(
        const LatLng(0, 0),
        const LatLng(0, 1),
      );
      expect(r.distanceMeters, 3500);
      expect(r.durationSeconds, 720);
      expect(r.polyline, isNotEmpty);
    });

    test('throws DirectionsException on ZERO_RESULTS', () async {
      when(() => client.get(any())).thenAnswer(
        (_) async => http.Response(
          jsonEncode({'status': 'ZERO_RESULTS', 'routes': []}),
          200,
        ),
      );
      expect(
        () => service.route(const LatLng(0, 0), const LatLng(0, 1)),
        throwsA(isA<DirectionsException>()),
      );
    });

    test('throws DirectionsException on HTTP error', () async {
      when(() => client.get(any())).thenAnswer(
        (_) async => http.Response('Bad Gateway', 502),
      );
      expect(
        () => service.route(const LatLng(0, 0), const LatLng(0, 1)),
        throwsA(isA<DirectionsException>()),
      );
    });
  });
}
