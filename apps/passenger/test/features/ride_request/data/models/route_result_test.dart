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
