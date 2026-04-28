import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:http/http.dart' as http;
import 'package:mocktail/mocktail.dart';
import 'package:passenger/features/ride_request/data/services/places_service.dart';

class _MockClient extends Mock implements http.Client {}

void main() {
  late _MockClient client;
  late PlacesService service;

  setUpAll(() {
    registerFallbackValue(Uri.parse('https://example.com'));
  });

  setUp(() {
    client = _MockClient();
    service = PlacesService(httpClient: client, apiKey: 'TEST_KEY');
  });

  group('autocomplete', () {
    test('builds URL with country=ar, language=es, key, and location bias', () async {
      when(() => client.get(any())).thenAnswer(
        (_) async => http.Response(
          jsonEncode({'status': 'OK', 'predictions': []}),
          200,
        ),
      );
      await service.autocomplete(
        'Termin',
        locationBias: const LatLng(-36.6167, -64.2833),
      );
      final captured = verify(() => client.get(captureAny())).captured.single as Uri;
      expect(captured.host, 'maps.googleapis.com');
      expect(captured.path, '/maps/api/place/autocomplete/json');
      expect(captured.queryParameters['input'], 'Termin');
      expect(captured.queryParameters['components'], 'country:ar');
      expect(captured.queryParameters['language'], 'es');
      expect(captured.queryParameters['key'], 'TEST_KEY');
      expect(captured.queryParameters['location'], '-36.6167,-64.2833');
      expect(captured.queryParameters['radius'], '50000');
    });

    test('parses predictions from response', () async {
      when(() => client.get(any())).thenAnswer(
        (_) async => http.Response(
          jsonEncode({
            'status': 'OK',
            'predictions': [
              {
                'place_id': 'ChIJ1',
                'description': 'Terminal de Ómnibus, Santa Rosa',
                'structured_formatting': {
                  'main_text': 'Terminal de Ómnibus',
                  'secondary_text': 'Santa Rosa, La Pampa',
                },
              },
            ],
          }),
          200,
        ),
      );
      final results = await service.autocomplete('Termin');
      expect(results.length, 1);
      expect(results.first.placeId, 'ChIJ1');
      expect(results.first.mainText, 'Terminal de Ómnibus');
    });

    test('returns [] when status is ZERO_RESULTS', () async {
      when(() => client.get(any())).thenAnswer(
        (_) async => http.Response(
          jsonEncode({'status': 'ZERO_RESULTS', 'predictions': []}),
          200,
        ),
      );
      final results = await service.autocomplete('zzz');
      expect(results, isEmpty);
    });

    test('throws PlacesException on non-OK status', () async {
      when(() => client.get(any())).thenAnswer(
        (_) async => http.Response(
          jsonEncode({'status': 'REQUEST_DENIED', 'error_message': 'invalid key'}),
          200,
        ),
      );
      expect(
        () => service.autocomplete('test'),
        throwsA(isA<PlacesException>()),
      );
    });

    test('throws PlacesException on HTTP error', () async {
      when(() => client.get(any())).thenAnswer(
        (_) async => http.Response('Forbidden', 403),
      );
      expect(
        () => service.autocomplete('test'),
        throwsA(isA<PlacesException>()),
      );
    });
  });

  group('details', () {
    test('parses geometry.location into LatLng', () async {
      when(() => client.get(any())).thenAnswer(
        (_) async => http.Response(
          jsonEncode({
            'status': 'OK',
            'result': {
              'geometry': {
                'location': {'lat': -36.61, 'lng': -64.29}
              }
            },
          }),
          200,
        ),
      );
      final loc = await service.details('ChIJ1');
      expect(loc.latitude, closeTo(-36.61, 0.001));
      expect(loc.longitude, closeTo(-64.29, 0.001));
    });

    test('asks only for the geometry field', () async {
      when(() => client.get(any())).thenAnswer(
        (_) async => http.Response(
          jsonEncode({
            'status': 'OK',
            'result': {
              'geometry': {'location': {'lat': 0, 'lng': 0}}
            },
          }),
          200,
        ),
      );
      await service.details('ChIJ1');
      final captured = verify(() => client.get(captureAny())).captured.single as Uri;
      expect(captured.queryParameters['fields'], 'geometry');
      expect(captured.queryParameters['place_id'], 'ChIJ1');
    });
  });
}
