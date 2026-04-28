# Address Search + Route Visualization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a premium Uber-style address search with real Google Places autocomplete and a Directions API polyline drawn on the map, in the passenger app.

**Architecture:** Direct HTTP calls from Flutter to Google Places + Directions APIs (Approach A from spec). New services under `data/services/`, new models under `data/models/`, new widgets under `home/presentation/widgets/`. Reuses existing Riverpod patterns and `GOOGLE_MAPS_API_KEY` from `Env`.

**Tech Stack:** Flutter, Riverpod, google_maps_flutter, http (transitive — promoted to direct), google_polyline_algorithm.

**Spec:** `docs/superpowers/specs/2026-04-28-address-search-routing-design.md`

**Project rule:** All work goes directly to `main`. No branches, no worktrees. Commit frequently and push.

---

## File map

### New files

| Path | Responsibility |
|---|---|
| `apps/passenger/lib/features/ride_request/data/models/place_prediction.dart` | Plain data class for Places autocomplete row. |
| `apps/passenger/lib/features/ride_request/data/models/route_result.dart` | Plain data class for Directions response. |
| `apps/passenger/lib/features/ride_request/data/services/places_service.dart` | Wraps Places Autocomplete + Place Details endpoints. |
| `apps/passenger/lib/features/ride_request/data/services/directions_service.dart` | Wraps Directions endpoint + polyline decode. |
| `apps/passenger/lib/features/home/presentation/widgets/route_info_chip.dart` | Floating chip on map: fare · ETA · distance. |
| `apps/passenger/lib/features/home/presentation/widgets/route_panel.dart` | Bottom panel with 3 states (collapsed / searching / routeReady). |
| `apps/passenger/test/features/ride_request/data/models/place_prediction_test.dart` | Unit tests for parser. |
| `apps/passenger/test/features/ride_request/data/models/route_result_test.dart` | Unit tests for parser + polyline decode. |
| `apps/passenger/test/features/ride_request/data/services/places_service_test.dart` | URL composition + response parsing. |
| `apps/passenger/test/features/ride_request/data/services/directions_service_test.dart` | URL composition + response parsing. |

### Modified files

| Path | Change |
|---|---|
| `apps/passenger/pubspec.yaml` | Add `http` (explicit) and `google_polyline_algorithm` deps. |
| `apps/passenger/lib/features/ride_request/data/ride_providers.dart` | Add `placesServiceProvider`, `directionsServiceProvider`, `placePredictionsProvider`, `routeProvider`. |
| `apps/passenger/lib/features/ride_request/presentation/screens/destination_search_screen.dart` | Wire Places autocomplete to a new "Sugerencias" section above Frecuentes/Recientes; remove the TODO. |
| `apps/passenger/lib/features/home/presentation/screens/home_screen.dart` | Replace `HomeBottomSheet` with `RoutePanel`. After destination is picked, draw polyline + animate camera to fit both markers + show `RouteInfoChip`. |

### Untouched

`tracking_screen.dart`, driver app, Supabase RPCs, Edge Functions, `home_bottom_sheet.dart` (kept for reference but no longer wired).

---

## Task 1: Add dependencies

**Files:**
- Modify: `apps/passenger/pubspec.yaml`

- [ ] **Step 1: Add http and polyline decoder to pubspec.yaml**

In `apps/passenger/pubspec.yaml`, in the `dependencies:` block, after the `flutter_typeahead: ^5.2.0` line, add:

```yaml
  # HTTP (Google APIs)
  http: ^1.2.2

  # Polyline decoding for Directions API
  google_polyline_algorithm: ^3.1.0
```

- [ ] **Step 2: Install**

From the **monorepo root** (`C:/MisProyectos/clientes/remis_app`):

```bash
cd apps/passenger && flutter pub get && cd ../..
```

Expected: `Got dependencies!` no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/passenger/pubspec.yaml apps/passenger/pubspec.lock
git commit -m "feat(passenger): add http + polyline deps for Places/Directions"
git push
```

---

## Task 2: PlacePrediction model (TDD)

**Files:**
- Create: `apps/passenger/lib/features/ride_request/data/models/place_prediction.dart`
- Test: `apps/passenger/test/features/ride_request/data/models/place_prediction_test.dart`

A `PlacePrediction` represents one row in the Places Autocomplete response. Fields: `placeId`, `mainText`, `secondaryText`, `description`.

- [ ] **Step 1: Write the failing test**

Create `apps/passenger/test/features/ride_request/data/models/place_prediction_test.dart`:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:passenger/features/ride_request/data/models/place_prediction.dart';

void main() {
  group('PlacePrediction.fromJson', () {
    test('parses a typical Places Autocomplete prediction', () {
      final p = PlacePrediction.fromJson({
        'place_id': 'ChIJ123',
        'description': 'Terminal de Ómnibus, Av. Spinetto, Santa Rosa, La Pampa, Argentina',
        'structured_formatting': {
          'main_text': 'Terminal de Ómnibus',
          'secondary_text': 'Av. Spinetto, Santa Rosa, La Pampa, Argentina',
        },
      });
      expect(p.placeId, 'ChIJ123');
      expect(p.mainText, 'Terminal de Ómnibus');
      expect(p.secondaryText, 'Av. Spinetto, Santa Rosa, La Pampa, Argentina');
      expect(p.description, contains('Terminal'));
    });

    test('falls back to description when structured_formatting is missing', () {
      final p = PlacePrediction.fromJson({
        'place_id': 'ChIJ456',
        'description': 'Fallback Address',
      });
      expect(p.mainText, 'Fallback Address');
      expect(p.secondaryText, '');
    });

    test('throws ArgumentError on missing place_id', () {
      expect(
        () => PlacePrediction.fromJson({'description': 'no id'}),
        throwsA(isA<ArgumentError>()),
      );
    });
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/passenger && flutter test test/features/ride_request/data/models/place_prediction_test.dart
```

Expected: FAIL — `Target of URI doesn't exist: '...place_prediction.dart'`.

- [ ] **Step 3: Implement the model**

Create `apps/passenger/lib/features/ride_request/data/models/place_prediction.dart`:

```dart
/// One result row from Google Places Autocomplete.
class PlacePrediction {
  const PlacePrediction({
    required this.placeId,
    required this.mainText,
    required this.secondaryText,
    required this.description,
  });

  final String placeId;
  final String mainText;
  final String secondaryText;
  final String description;

  factory PlacePrediction.fromJson(Map<String, dynamic> json) {
    final placeId = json['place_id'] as String?;
    if (placeId == null || placeId.isEmpty) {
      throw ArgumentError('PlacePrediction missing place_id');
    }
    final description = (json['description'] as String?) ?? '';
    final structured = json['structured_formatting'] as Map<String, dynamic>?;
    return PlacePrediction(
      placeId: placeId,
      mainText: (structured?['main_text'] as String?) ?? description,
      secondaryText: (structured?['secondary_text'] as String?) ?? '',
      description: description,
    );
  }
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
flutter test test/features/ride_request/data/models/place_prediction_test.dart
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd ../.. && git add apps/passenger/lib/features/ride_request/data/models/place_prediction.dart apps/passenger/test/features/ride_request/data/models/place_prediction_test.dart
git commit -m "feat(passenger): add PlacePrediction model + tests"
git push
```

---

## Task 3: RouteResult model with polyline decoding (TDD)

**Files:**
- Create: `apps/passenger/lib/features/ride_request/data/models/route_result.dart`
- Test: `apps/passenger/test/features/ride_request/data/models/route_result_test.dart`

A `RouteResult` holds the decoded polyline points, total distance (m), and duration (s). It is built from a Directions API JSON response. Polyline decoding uses the `google_polyline_algorithm` package.

- [ ] **Step 1: Write the failing test**

Create `apps/passenger/test/features/ride_request/data/models/route_result_test.dart`:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:passenger/features/ride_request/data/models/route_result.dart';

void main() {
  group('RouteResult.fromDirectionsJson', () {
    test('parses distance, duration, and decodes polyline', () {
      final json = {
        'status': 'OK',
        'routes': [
          {
            'overview_polyline': {
              // Encoded polyline for [(38.5, -120.2), (40.7, -120.95), (43.252, -126.453)]
              'points': '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
            },
            'legs': [
              {
                'distance': {'value': 1234},
                'duration': {'value': 567},
              }
            ],
          }
        ],
      };
      final r = RouteResult.fromDirectionsJson(json);
      expect(r.distanceMeters, 1234);
      expect(r.durationSeconds, 567);
      expect(r.polyline.length, 3);
      expect(r.polyline.first.latitude, closeTo(38.5, 0.001));
      expect(r.polyline.first.longitude, closeTo(-120.2, 0.001));
    });

    test('throws when status is not OK', () {
      final json = {'status': 'ZERO_RESULTS', 'routes': []};
      expect(
        () => RouteResult.fromDirectionsJson(json),
        throwsA(isA<DirectionsException>()),
      );
    });

    test('throws when routes array is empty', () {
      final json = {'status': 'OK', 'routes': []};
      expect(
        () => RouteResult.fromDirectionsJson(json),
        throwsA(isA<DirectionsException>()),
      );
    });
  });

  group('DirectionsException', () {
    test('exposes status code', () {
      final e = DirectionsException('ZERO_RESULTS', 'no route');
      expect(e.status, 'ZERO_RESULTS');
      expect(e.toString(), contains('ZERO_RESULTS'));
    });
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/passenger && flutter test test/features/ride_request/data/models/route_result_test.dart
```

Expected: FAIL — file does not exist.

- [ ] **Step 3: Implement the model**

Create `apps/passenger/lib/features/ride_request/data/models/route_result.dart`:

```dart
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:google_polyline_algorithm/google_polyline_algorithm.dart';

/// The decoded result of a Google Directions API call.
class RouteResult {
  const RouteResult({
    required this.polyline,
    required this.distanceMeters,
    required this.durationSeconds,
  });

  final List<LatLng> polyline;
  final int distanceMeters;
  final int durationSeconds;

  factory RouteResult.fromDirectionsJson(Map<String, dynamic> json) {
    final status = json['status'] as String?;
    if (status != 'OK') {
      throw DirectionsException(status ?? 'UNKNOWN', 'Directions returned $status');
    }
    final routes = json['routes'] as List?;
    if (routes == null || routes.isEmpty) {
      throw DirectionsException('NO_ROUTES', 'Directions returned empty routes');
    }
    final route = routes.first as Map<String, dynamic>;
    final encoded = (route['overview_polyline'] as Map<String, dynamic>)['points'] as String;
    final decoded = decodePolyline(encoded)
        .map((p) => LatLng((p[0] as num).toDouble(), (p[1] as num).toDouble()))
        .toList();
    final leg = (route['legs'] as List).first as Map<String, dynamic>;
    return RouteResult(
      polyline: decoded,
      distanceMeters: (leg['distance']['value'] as num).toInt(),
      durationSeconds: (leg['duration']['value'] as num).toInt(),
    );
  }

  int get distanceKm => (distanceMeters / 1000).round();
  int get durationMinutes => (durationSeconds / 60).round();
}

class DirectionsException implements Exception {
  DirectionsException(this.status, this.message);
  final String status;
  final String message;
  @override
  String toString() => 'DirectionsException($status): $message';
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
flutter test test/features/ride_request/data/models/route_result_test.dart
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd ../.. && git add apps/passenger/lib/features/ride_request/data/models/route_result.dart apps/passenger/test/features/ride_request/data/models/route_result_test.dart
git commit -m "feat(passenger): add RouteResult with polyline decode + tests"
git push
```

---

## Task 4: PlacesService (TDD)

**Files:**
- Create: `apps/passenger/lib/features/ride_request/data/services/places_service.dart`
- Test: `apps/passenger/test/features/ride_request/data/services/places_service_test.dart`

`PlacesService` wraps two endpoints:
- `autocomplete(query, locationBias)` → `List<PlacePrediction>`
- `details(placeId)` → `LatLng`

Argentina is enforced via `components=country:ar`. Language is `es`. The `http.Client` is injected so tests can mock it with `mocktail`.

- [ ] **Step 1: Write the failing test**

Create `apps/passenger/test/features/ride_request/data/services/places_service_test.dart`:

```dart
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/passenger && flutter test test/features/ride_request/data/services/places_service_test.dart
```

Expected: FAIL — file does not exist.

- [ ] **Step 3: Implement the service**

Create `apps/passenger/lib/features/ride_request/data/services/places_service.dart`:

```dart
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
      throw PlacesException(status ?? 'UNKNOWN', body['error_message']?.toString() ?? '');
    }
    final list = (body['predictions'] as List? ?? const [])
        .cast<Map<String, dynamic>>();
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
      throw PlacesException(status ?? 'UNKNOWN', body['error_message']?.toString() ?? '');
    }
    final loc = (body['result'] as Map<String, dynamic>)['geometry']['location']
        as Map<String, dynamic>;
    return LatLng((loc['lat'] as num).toDouble(), (loc['lng'] as num).toDouble());
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
```

- [ ] **Step 4: Run tests to verify pass**

```bash
flutter test test/features/ride_request/data/services/places_service_test.dart
```

Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd ../.. && git add apps/passenger/lib/features/ride_request/data/services/places_service.dart apps/passenger/test/features/ride_request/data/services/places_service_test.dart
git commit -m "feat(passenger): add PlacesService (autocomplete + details)"
git push
```

---

## Task 5: DirectionsService (TDD)

**Files:**
- Create: `apps/passenger/lib/features/ride_request/data/services/directions_service.dart`
- Test: `apps/passenger/test/features/ride_request/data/services/directions_service_test.dart`

`DirectionsService.route(origin, destination)` returns a `RouteResult`. Mode = `driving`, language = `es`.

- [ ] **Step 1: Write the failing test**

Create `apps/passenger/test/features/ride_request/data/services/directions_service_test.dart`:

```dart
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
                'legs': [{'distance': {'value': 100}, 'duration': {'value': 60}}],
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
      final captured = verify(() => client.get(captureAny())).captured.single as Uri;
      expect(captured.host, 'maps.googleapis.com');
      expect(captured.path, '/maps/api/directions/json');
      expect(captured.queryParameters['origin'], '-36.6,-64.28');
      expect(captured.queryParameters['destination'], '-36.61,-64.29');
      expect(captured.queryParameters['mode'], 'driving');
      expect(captured.queryParameters['language'], 'es');
      expect(captured.queryParameters['key'], 'TEST_KEY');
    });

    test('returns RouteResult with decoded polyline + distance + duration', () async {
      when(() => client.get(any())).thenAnswer(
        (_) async => http.Response(
          jsonEncode({
            'status': 'OK',
            'routes': [
              {
                'overview_polyline': {'points': '_p~iF~ps|U_ulLnnqC_mqNvxq`@'},
                'legs': [{'distance': {'value': 3500}, 'duration': {'value': 720}}],
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/passenger && flutter test test/features/ride_request/data/services/directions_service_test.dart
```

Expected: FAIL — file does not exist.

- [ ] **Step 3: Implement the service**

Create `apps/passenger/lib/features/ride_request/data/services/directions_service.dart`:

```dart
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
```

- [ ] **Step 4: Run tests to verify pass**

```bash
flutter test test/features/ride_request/data/services/directions_service_test.dart
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd ../.. && git add apps/passenger/lib/features/ride_request/data/services/directions_service.dart apps/passenger/test/features/ride_request/data/services/directions_service_test.dart
git commit -m "feat(passenger): add DirectionsService"
git push
```

---

## Task 6: Riverpod providers

**Files:**
- Modify: `apps/passenger/lib/features/ride_request/data/ride_providers.dart`

Add four new providers:
1. `placesServiceProvider` — singleton, wraps `PlacesService` with `Env.googleMapsApiKey`.
2. `directionsServiceProvider` — singleton, wraps `DirectionsService`.
3. `placePredictionsProvider` — `FutureProvider.family<List<PlacePrediction>, _AutocompleteKey>` for query+location bias.
4. `routeProvider` — `FutureProvider.family<RouteResult, _RouteKey>` keyed by origin+destination.

For the family keys we use simple records `(String query, LatLng? bias)` and `(LatLng origin, LatLng dest)`. Riverpod handles record equality natively (Dart 3 records compare structurally).

- [ ] **Step 1: Add imports + providers to ride_providers.dart**

Open `apps/passenger/lib/features/ride_request/data/ride_providers.dart` and add the following imports next to the existing ones:

```dart
import 'package:http/http.dart' as http;

import '../../../core/env/env.dart';
import 'models/place_prediction.dart';
import 'models/route_result.dart';
import 'services/directions_service.dart';
import 'services/places_service.dart';
```

Then append at the end of the file:

```dart
// ---------------------------------------------------------------------------
// Google Places + Directions
// ---------------------------------------------------------------------------

final _googleHttpClientProvider = Provider<http.Client>((ref) {
  final c = http.Client();
  ref.onDispose(c.close);
  return c;
});

final placesServiceProvider = Provider<PlacesService>((ref) {
  return PlacesService(
    httpClient: ref.watch(_googleHttpClientProvider),
    apiKey: Env.googleMapsApiKey,
  );
});

final directionsServiceProvider = Provider<DirectionsService>((ref) {
  return DirectionsService(
    httpClient: ref.watch(_googleHttpClientProvider),
    apiKey: Env.googleMapsApiKey,
  );
});

/// Key for Places autocomplete: query + optional location bias.
typedef AutocompleteKey = ({String query, LatLng? bias});

/// Live autocomplete results. Returns [] for queries shorter than 2 chars.
final placePredictionsProvider =
    FutureProvider.family<List<PlacePrediction>, AutocompleteKey>((ref, key) async {
  if (key.query.trim().length < 2) return const [];
  return ref.watch(placesServiceProvider).autocomplete(
        key.query.trim(),
        locationBias: key.bias,
      );
});

/// Key for Directions: origin + destination snapshot.
typedef RouteKey = ({LatLng origin, LatLng destination});

/// Driving route between origin and destination.
final routeProvider =
    FutureProvider.family<RouteResult, RouteKey>((ref, key) async {
  return ref.watch(directionsServiceProvider).route(key.origin, key.destination);
});
```

- [ ] **Step 2: Verify the file compiles**

```bash
cd apps/passenger && flutter analyze lib/features/ride_request/data/ride_providers.dart
```

Expected: No issues.

- [ ] **Step 3: Run the full passenger test suite as a smoke check**

```bash
flutter test
```

Expected: All previously passing tests still PASS. (No new tests for providers — they are wired correctly if `flutter analyze` succeeds and the consuming widgets in later tasks render without errors.)

- [ ] **Step 4: Commit**

```bash
cd ../.. && git add apps/passenger/lib/features/ride_request/data/ride_providers.dart
git commit -m "feat(passenger): add Places + Directions Riverpod providers"
git push
```

---

## Task 7: Wire Places autocomplete into destination_search_screen

**Files:**
- Modify: `apps/passenger/lib/features/ride_request/presentation/screens/destination_search_screen.dart`

Add a new "Sugerencias" section *above* "Frecuentes" that shows live Places predictions when the user has typed ≥2 characters. Selecting a suggestion calls `details(placeId)` to resolve the LatLng, then invokes `onDestinationSelected`. The existing TODO comment is removed. Recents/POIs/Frequents stay as-is (still shown when query is empty or short).

- [ ] **Step 1: Replace the file's docstring + TODO**

In `destination_search_screen.dart`, find lines 28–40 (the docstring with the TODO) and replace with:

```dart
/// Full-screen overlay shown when the passenger taps "¿A dónde vamos?".
///
/// Calls [onDestinationSelected] with the chosen [DestinationResult] and pops.
/// Closing without a selection pops without invoking the callback.
///
/// Live results come from Google Places Autocomplete (Argentina-biased).
/// Frecuentes/Recientes/Sugerencias-locales remain as fallbacks for an
/// empty query and as quick-pick rows.
```

- [ ] **Step 2: Add imports**

Add these imports at the top of the file (after the existing imports):

```dart
import '../../data/models/place_prediction.dart';
import '../../data/services/places_service.dart';
```

- [ ] **Step 3: Add `currentLocation` parameter to the screen**

The bias for autocomplete needs the user's current GPS. Update the `DestinationSearchScreen` constructor:

```dart
class DestinationSearchScreen extends ConsumerStatefulWidget {
  const DestinationSearchScreen({
    super.key,
    required this.onDestinationSelected,
    this.currentLocation,
  });

  final void Function(DestinationResult result) onDestinationSelected;
  final LatLng? currentLocation;

  @override
  ConsumerState<DestinationSearchScreen> createState() =>
      _DestinationSearchScreenState();
}
```

- [ ] **Step 4: Add a debounced query state in _DestinationSearchScreenState**

Replace the existing `_query` field and `_onQueryChanged` method:

```dart
String _query = '';            // raw, used for client-side filter
String _debouncedQuery = '';   // debounced, used for Places API
Timer? _debounce;

@override
void dispose() {
  _debounce?.cancel();
  _controller.dispose();
  _focusNode.dispose();
  super.dispose();
}

void _onQueryChanged(String value) {
  setState(() => _query = value.trim().toLowerCase());
  _debounce?.cancel();
  _debounce = Timer(const Duration(milliseconds: 400), () {
    if (!mounted) return;
    setState(() => _debouncedQuery = value.trim());
  });
}
```

Add `import 'dart:async';` at the top (with the other imports — `dart:` first by convention, but follow whatever the file already uses).

- [ ] **Step 5: Add the new "Sugerencias" section widget at the bottom of the file**

Append after the existing `_SectionLoading` class:

```dart
// ---------------------------------------------------------------------------
// Google Places suggestions (live)
// ---------------------------------------------------------------------------

class _PlacesSection extends ConsumerWidget {
  const _PlacesSection({
    required this.query,
    required this.bias,
    required this.onSelect,
  });

  final String query;
  final LatLng? bias;
  final void Function(DestinationResult) onSelect;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (query.trim().length < 2) return const SizedBox.shrink();
    final async = ref.watch(
      placePredictionsProvider((query: query, bias: bias)),
    );
    return async.when(
      loading: () => const _SectionLoading(),
      error: (e, _) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Text(
          e is PlacesException && e.status == 'HTTP_403'
              ? 'No se pudieron cargar sugerencias.'
              : 'Sin conexión.',
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ),
      data: (predictions) {
        if (predictions.isEmpty) return const SizedBox.shrink();
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _SectionHeader('Sugerencias'),
            ...predictions.map((p) => _PredictionTile(
                  prediction: p,
                  query: query,
                  onTap: () => _resolveAndSelect(ref, p),
                )),
          ],
        );
      },
    );
  }

  Future<void> _resolveAndSelect(WidgetRef ref, PlacePrediction p) async {
    try {
      final loc = await ref.read(placesServiceProvider).details(p.placeId);
      onSelect(DestinationResult(
        label: p.mainText,
        address: p.description.isNotEmpty ? p.description : p.mainText,
        location: loc,
      ));
    } catch (_) {
      // Swallow — surface a snackbar in caller if desired.
    }
  }
}

class _PredictionTile extends StatelessWidget {
  const _PredictionTile({
    required this.prediction,
    required this.query,
    required this.onTap,
  });

  final PlacePrediction prediction;
  final String query;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListTile(
      leading: Icon(Icons.place_outlined, color: theme.colorScheme.primary),
      title: _highlight(prediction.mainText, query, theme),
      subtitle: Text(
        prediction.secondaryText,
        style: theme.textTheme.bodyMedium?.copyWith(
          color: theme.colorScheme.onSurfaceVariant,
        ),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      onTap: onTap,
    );
  }

  Widget _highlight(String text, String q, ThemeData theme) {
    if (q.isEmpty) return Text(text, style: theme.textTheme.bodyLarge);
    final lower = text.toLowerCase();
    final i = lower.indexOf(q.toLowerCase());
    if (i < 0) return Text(text, style: theme.textTheme.bodyLarge);
    return RichText(
      text: TextSpan(
        style: theme.textTheme.bodyLarge,
        children: [
          TextSpan(text: text.substring(0, i)),
          TextSpan(
            text: text.substring(i, i + q.length),
            style: TextStyle(
              color: theme.colorScheme.primary,
              fontWeight: FontWeight.w700,
            ),
          ),
          TextSpan(text: text.substring(i + q.length)),
        ],
      ),
    );
  }
}
```

- [ ] **Step 6: Insert the section at the top of the ListView**

Find the `ListView` inside the `Expanded` (around lines 150–175). Add the new section as the first child:

```dart
ListView(
  keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
  padding: const EdgeInsets.only(bottom: 24),
  children: [
    _PlacesSection(
      query: _debouncedQuery,
      bias: widget.currentLocation,
      onSelect: _select,
    ),
    _FrequentesSection(
      asyncValue: frequentAsync,
      query: _query,
      matches: _matches,
      onSelect: _select,
    ),
    _RecientesSection(
      asyncValue: recentAsync,
      query: _query,
      matches: _matches,
      onSelect: _select,
    ),
    _SugerenciasSection(
      asyncValue: poisAsync,
      query: _query,
      matches: _matches,
      onSelect: _select,
    ),
  ],
),
```

- [ ] **Step 7: Verify it analyzes**

```bash
cd apps/passenger && flutter analyze lib/features/ride_request/presentation/screens/destination_search_screen.dart
```

Expected: No issues.

- [ ] **Step 8: Run the full test suite (regression check)**

```bash
flutter test
```

Expected: PASS for all tests.

- [ ] **Step 9: Commit**

```bash
cd ../.. && git add apps/passenger/lib/features/ride_request/presentation/screens/destination_search_screen.dart
git commit -m "feat(passenger): wire Google Places autocomplete in destination search"
git push
```

---

## Task 8: RouteInfoChip widget

**Files:**
- Create: `apps/passenger/lib/features/home/presentation/widgets/route_info_chip.dart`

A floating chip showing fare · ETA · distance, displayed at the top of the map after a route is computed. Receives plain values — caller composes the data.

- [ ] **Step 1: Create the widget**

Create `apps/passenger/lib/features/home/presentation/widgets/route_info_chip.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class RouteInfoChip extends StatelessWidget {
  const RouteInfoChip({
    super.key,
    required this.fareArs,
    required this.durationMinutes,
    required this.distanceKm,
  });

  final double? fareArs;       // null → fare unavailable
  final int durationMinutes;
  final int distanceKm;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final fmt = NumberFormat('#,###', 'es_AR');
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.78),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (fareArs != null) ...[
            Text(
              '~\$${fmt.format(fareArs!.round())}',
              style: theme.textTheme.titleSmall?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w800,
              ),
            ),
            _Dot(),
          ],
          Text(
            '$durationMinutes min',
            style: theme.textTheme.bodyMedium
                ?.copyWith(color: Colors.white.withValues(alpha: 0.85)),
          ),
          _Dot(),
          Text(
            '$distanceKm km',
            style: theme.textTheme.bodyMedium
                ?.copyWith(color: Colors.white.withValues(alpha: 0.85)),
          ),
        ],
      ),
    );
  }
}

class _Dot extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Text('·', style: TextStyle(color: Colors.white.withValues(alpha: 0.4))),
    );
  }
}
```

- [ ] **Step 2: Analyze**

```bash
cd apps/passenger && flutter analyze lib/features/home/presentation/widgets/route_info_chip.dart
```

Expected: No issues.

- [ ] **Step 3: Commit**

```bash
cd ../.. && git add apps/passenger/lib/features/home/presentation/widgets/route_info_chip.dart
git commit -m "feat(passenger): add RouteInfoChip widget"
git push
```

---

## Task 9: RoutePanel widget (3 states)

**Files:**
- Create: `apps/passenger/lib/features/home/presentation/widgets/route_panel.dart`

A bottom panel with three visual states. The panel itself is dumb: it shows what the parent tells it. State machine lives in `home_screen.dart` (next task).

States:
- `collapsed` — origin (read-only) + "¿A dónde vas?" tap target.
- `routeReady` — origin → destination (read-only) + "Confirmar destino" CTA.
  (The "searching" state is handled by pushing the existing `DestinationSearchScreen` as a route, so the panel only owns `collapsed` and `routeReady`.)

- [ ] **Step 1: Create the widget**

Create `apps/passenger/lib/features/home/presentation/widgets/route_panel.dart`:

```dart
import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';

/// Bottom panel for the hybrid home layout.
///
/// Two states:
/// - [destinationLabel] is null → collapsed: shows "¿A dónde vas?" CTA.
/// - [destinationLabel] is set  → route-ready: shows origen → destino + Confirmar.
class RoutePanel extends StatelessWidget {
  const RoutePanel({
    super.key,
    required this.pickupAddress,
    required this.destinationLabel,
    required this.destinationAddress,
    required this.onSearchTap,
    required this.onClearDestination,
    required this.onConfirm,
  });

  final String pickupAddress;       // e.g. "Mi ubicación" or street
  final String? destinationLabel;   // null → collapsed state
  final String? destinationAddress;
  final VoidCallback onSearchTap;
  final VoidCallback onClearDestination;
  final VoidCallback onConfirm;

  @override
  Widget build(BuildContext context) {
    final isCollapsed = destinationLabel == null;
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final surface = isDark ? AppColors.neutralD100 : Colors.white;

    return Material(
      color: surface,
      elevation: 12,
      shadowColor: Colors.black.withValues(alpha: 0.4),
      borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: theme.colorScheme.outline.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 16),
              isCollapsed
                  ? _buildCollapsed(context)
                  : _buildRouteReady(context),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCollapsed(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: [
        // Origin row (read-only)
        _AddressRow(
          dotColor: const Color(0xFF4CAF50),
          label: 'ORIGEN',
          value: pickupAddress,
        ),
        const SizedBox(height: 10),
        // Destination tap target
        InkWell(
          onTap: onSearchTap,
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest
                  .withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: theme.colorScheme.primary.withValues(alpha: 0.3),
                width: 1.5,
                style: BorderStyle.solid,
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF44336).withValues(alpha: 0.5),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    '¿A dónde vas?',
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: theme.colorScheme.primary.withValues(alpha: 0.9),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                Icon(Icons.chevron_right,
                    color: theme.colorScheme.outline.withValues(alpha: 0.5)),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildRouteReady(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: [
        // Origin → Destination
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Column(
              children: [
                Container(
                  width: 10,
                  height: 10,
                  decoration: const BoxDecoration(
                      color: Color(0xFF4CAF50), shape: BoxShape.circle),
                ),
                Container(
                  width: 1,
                  height: 24,
                  color: theme.colorScheme.outline.withValues(alpha: 0.3),
                ),
                Container(
                  width: 10,
                  height: 10,
                  decoration: const BoxDecoration(
                      color: Color(0xFFF44336), shape: BoxShape.circle),
                ),
              ],
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    pickupAddress,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 14),
                  Text(
                    destinationLabel!,
                    style: theme.textTheme.titleSmall
                        ?.copyWith(fontWeight: FontWeight.w700),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (destinationAddress != null &&
                      destinationAddress != destinationLabel)
                    Text(
                      destinationAddress!,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                ],
              ),
            ),
            IconButton(
              onPressed: onClearDestination,
              icon: const Icon(Icons.edit_outlined, size: 20),
              tooltip: 'Cambiar destino',
            ),
          ],
        ),
        const SizedBox(height: 16),
        // Confirm CTA
        SizedBox(
          width: double.infinity,
          child: FilledButton(
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            onPressed: onConfirm,
            child: const Text(
              'Confirmar destino',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
            ),
          ),
        ),
      ],
    );
  }
}

class _AddressRow extends StatelessWidget {
  const _AddressRow({
    required this.dotColor,
    required this.label,
    required this.value,
  });

  final Color dotColor;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(color: dotColor, shape: BoxShape.circle),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                    letterSpacing: 0.8,
                  ),
                ),
                Text(
                  value,
                  style: theme.textTheme.bodyMedium,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
```

- [ ] **Step 2: Analyze**

```bash
cd apps/passenger && flutter analyze lib/features/home/presentation/widgets/route_panel.dart
```

Expected: No issues.

- [ ] **Step 3: Commit**

```bash
cd ../.. && git add apps/passenger/lib/features/home/presentation/widgets/route_panel.dart
git commit -m "feat(passenger): add RoutePanel widget with collapsed/routeReady states"
git push
```

---

## Task 10: Refactor home_screen.dart to hybrid layout + polyline

**Files:**
- Modify: `apps/passenger/lib/features/home/presentation/screens/home_screen.dart`

This task wires everything together:
1. Replace `HomeBottomSheet` with `RoutePanel`.
2. Track destination + route in state.
3. Draw polyline on the map when route is loaded.
4. Animate camera to fit both markers (`LatLngBounds`).
5. Show `RouteInfoChip` at top of map when route is ready.
6. Pass `currentLocation` to `DestinationSearchScreen` for autocomplete bias.
7. The "Confirmar destino" CTA opens the existing `RideConfirmationSheet` (no change to downstream flow).

- [ ] **Step 1: Add imports**

In `home_screen.dart`, add these imports near the existing ones:

```dart
import '../../../ride_request/data/models/route_result.dart';
import '../../../ride_request/data/ride_providers.dart';
import '../widgets/route_info_chip.dart';
import '../widgets/route_panel.dart';
```

(Some are already imported — only add the missing ones. Remove the import for `home_bottom_sheet.dart` since we're replacing it.)

- [ ] **Step 2: Add destination + route state fields**

Inside `_HomeScreenState`, add below the existing fields:

```dart
DestinationResult? _destination;
RouteResult? _route;
double? _fareArs; // populated from existing fareEstimateProvider once we have a route
```

- [ ] **Step 3: Replace `_openDestinationSearch` to pass currentLocation + handle result**

Replace the existing `_openDestinationSearch` method body (around lines 107–120) with:

```dart
void _openDestinationSearch() {
  Navigator.push<DestinationResult>(
    context,
    MaterialPageRoute(
      fullscreenDialog: true,
      builder: (_) => DestinationSearchScreen(
        currentLocation: _pickupLocation,
        onDestinationSelected: (result) {
          Navigator.pop(context);
          _onDestinationSelected(result);
        },
      ),
    ),
  );
}
```

- [ ] **Step 4: Rewrite `_onDestinationSelected` to fetch the route and animate camera**

Replace the existing `_onDestinationSelected` body with:

```dart
Future<void> _onDestinationSelected(DestinationResult dest) async {
  final pickup = _pickupLocation;
  if (pickup == null) return;

  setState(() {
    _destination = dest;
    _route = null;
    _fareArs = null;
  });

  // Fetch route and fare in parallel.
  final routeFuture = ref.read(directionsServiceProvider).route(pickup, dest.location);
  final fareFuture = ref
      .read(rideRepositoryProvider)
      .estimateFare(pickup: pickup, dest: dest.location)
      .then<double?>((f) => f.estimatedAmountArs)
      .catchError((_) => null);

  try {
    final route = await routeFuture;
    if (!mounted) return;
    setState(() => _route = route);
    _fitCameraToRoute(pickup, dest.location);
  } catch (e) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('No se pudo calcular la ruta')),
    );
  }

  final fare = await fareFuture;
  if (!mounted) return;
  setState(() => _fareArs = fare);
}

void _fitCameraToRoute(LatLng a, LatLng b) {
  final ctrl = _mapController;
  if (ctrl == null) return;
  final bounds = LatLngBounds(
    southwest: LatLng(
      a.latitude < b.latitude ? a.latitude : b.latitude,
      a.longitude < b.longitude ? a.longitude : b.longitude,
    ),
    northeast: LatLng(
      a.latitude > b.latitude ? a.latitude : b.latitude,
      a.longitude > b.longitude ? a.longitude : b.longitude,
    ),
  );
  // 80px padding so chip + panel don't overlap markers.
  ctrl.animateCamera(CameraUpdate.newLatLngBounds(bounds, 80));
}

void _clearDestination() {
  setState(() {
    _destination = null;
    _route = null;
    _fareArs = null;
  });
  if (_pickupLocation != null) {
    _mapController?.animateCamera(
      CameraUpdate.newLatLngZoom(_pickupLocation!, 15.5),
    );
  }
}

void _confirmDestination() {
  final pickup = _pickupLocation;
  final dest = _destination;
  if (pickup == null || dest == null) return;

  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    builder: (_) => RideConfirmationSheet(
      pickup: pickup,
      dest: dest,
      pickupAddress: 'Mi ubicación',
      onRideCreated: (ride) {
        if (!mounted) return;
        context.go(AppRoutes.waiting, extra: ride.id);
      },
    ),
  );
}
```

- [ ] **Step 5: Update the build() method's GoogleMap markers + add polyline**

Inside the `GoogleMap` widget call, replace the `markers:` block and add `polylines:`:

```dart
markers: {
  if (_pickupLocation != null)
    Marker(
      markerId: const MarkerId('pickup'),
      position: _pickupLocation!,
      icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
      draggable: _destination == null,
      onDragEnd: (pos) => setState(() => _pickupLocation = pos),
    ),
  if (_destination != null)
    Marker(
      markerId: const MarkerId('destination'),
      position: _destination!.location,
      icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
      infoWindow: InfoWindow(title: _destination!.label),
    ),
},
polylines: {
  if (_route != null)
    Polyline(
      polylineId: const PolylineId('route'),
      points: _route!.polyline,
      color: Theme.of(context).colorScheme.primary,
      width: 5,
      startCap: Cap.roundCap,
      endCap: Cap.roundCap,
    ),
},
```

- [ ] **Step 6: Replace `HomeBottomSheet` with `RoutePanel`**

Find the `HomeBottomSheet` invocation near the bottom of the `Stack` children (around lines 247–252) and replace with:

```dart
Align(
  alignment: Alignment.bottomCenter,
  child: RoutePanel(
    pickupAddress: 'Mi ubicación',
    destinationLabel: _destination?.label,
    destinationAddress: _destination?.address,
    onSearchTap: _pickupLocation != null ? _openDestinationSearch : () {},
    onClearDestination: _clearDestination,
    onConfirm: _confirmDestination,
  ),
),
```

- [ ] **Step 7: Add the RouteInfoChip overlay at top of map**

Add this as a new child inside the `Stack`, immediately after the `_TopBar` Positioned block:

```dart
if (_route != null)
  Positioned(
    top: 90,
    left: 0,
    right: 0,
    child: SafeArea(
      child: Center(
        child: RouteInfoChip(
          fareArs: _fareArs,
          durationMinutes: _route!.durationMinutes,
          distanceKm: _route!.distanceKm,
        ),
      ),
    ),
  ),
```

- [ ] **Step 8: Analyze**

```bash
cd apps/passenger && flutter analyze lib/features/home/presentation/screens/home_screen.dart
```

Expected: No issues. (If there are unused import warnings for `home_bottom_sheet.dart` or `RideConfirmationSheet`, leave the latter — it's still used.)

- [ ] **Step 9: Run all tests as a regression check**

```bash
flutter test
```

Expected: PASS for all existing tests (none of them touch the home screen widget tree).

- [ ] **Step 10: Commit**

```bash
cd ../.. && git add apps/passenger/lib/features/home/presentation/screens/home_screen.dart
git commit -m "feat(passenger): hybrid home layout with route polyline + info chip"
git push
```

---

## Task 11: End-to-end manual verification

**Files:** None (manual run)

This is the verification gate before declaring the feature complete.

- [ ] **Step 1: Sync env and run on Android emulator**

From the monorepo root:

```bash
pnpm env:sync
cd apps/passenger
flutter run --dart-define-from-file=env/dev.json
```

- [ ] **Step 2: Verify the 8 acceptance scenarios**

| # | Scenario | Pass criteria |
|---|---|---|
| 1 | Open the app fresh | Map loads, green pin on current location, panel shows "¿A dónde vas?" |
| 2 | Tap "¿A dónde vas?" | DestinationSearchScreen opens with the search bar focused |
| 3 | Type "Termin" (≥2 chars, wait ~500 ms) | "Sugerencias" section appears with Places results, matched substring is highlighted |
| 4 | Type a residential street + number (e.g. "Pueyrredón 50") | Real address appears in suggestions |
| 5 | Type a destination clearly outside Argentina (e.g. "Times Square") | No Argentina results shown (filtered) |
| 6 | Tap a Places suggestion | Returns to map, polyline drawn following streets, camera fits both markers, RouteInfoChip shows `~$X · Y min · Z km` |
| 7 | Tap the edit icon on the panel (route-ready state) | Destination cleared, polyline removed, panel back to "¿A dónde vas?", camera re-centers on pickup |
| 8 | Tap "Confirmar destino" | Existing RideConfirmationSheet appears (downstream flow unchanged) |

- [ ] **Step 3: Verify error handling manually**

| Scenario | Expected |
|---|---|
| Toggle airplane mode → type in search | "Sin conexión" hint inside the suggestions area; recents/favorites still tappable |
| Pick a destination over the ocean (no driving route) | Snackbar "No se pudo calcular la ruta"; markers still drawn; chip omitted |

- [ ] **Step 4: If everything passes, commit any final tweaks**

If you needed to adjust spacing, copy, or fix a runtime bug found during QA, commit it now:

```bash
git add -A
git commit -m "fix(passenger): polish from end-to-end QA"
git push
```

- [ ] **Step 5: Mark feature complete**

The address search + route visualization feature is done.

Out of scope (deferred):
- Migrating the API key to Supabase Edge Functions (TODO already documented in spec).
- Restricting the API key to the Android signature in Google Cloud Console.
- Places session tokens for billing optimization.

---

## Notes for the implementer

- **TDD discipline.** Every service/model task follows red-green-commit. Don't skip the failing-test step — it's how we know the test actually exercises the new code.
- **No worktrees, no branches** — project rule. Everything goes to `main` directly. Commit and `git push` after every task.
- **`dart-define-from-file=env/dev.json`** is wired through Cursor's launch.json + `pnpm env:sync`. If `flutter run` complains about `GOOGLE_MAPS_API_KEY` being empty, run `pnpm env:sync` from the monorepo root first.
- **Don't touch the driver app.** This work is scoped to `apps/passenger` only.
- **Don't refactor the existing destination search sections.** Frecuentes/Recientes/POIs are kept as-is — we add a new "Sugerencias" section above them.
