import 'package:flutter_test/flutter_test.dart';
import 'package:passenger/features/ride_request/data/models/fare_estimate_model.dart';

void main() {
  group('FareEstimateModel.fromMap', () {
    test('parses all fields', () {
      final m = FareEstimateModel.fromMap({
        'estimated_amount_ars': 1500.0,
        'estimated_distance_m': 3500.0,
        'breakdown': {'base': 800, 'distance': 700},
      });
      expect(m.estimatedAmountArs, 1500.0);
      expect(m.estimatedDistanceM, 3500.0);
      expect(m.breakdown, isNotNull);
      expect(m.breakdown!['base'], 800);
    });

    test('null values fallback to 0.0', () {
      final m = FareEstimateModel.fromMap({});
      expect(m.estimatedAmountArs, 0.0);
      expect(m.estimatedDistanceM, 0.0);
      expect(m.breakdown, isNull);
    });

    test('integer values coerce to double', () {
      final m = FareEstimateModel.fromMap({
        'estimated_amount_ars': 1500,
        'estimated_distance_m': 5000,
      });
      expect(m.estimatedAmountArs, isA<double>());
      expect(m.estimatedDistanceM, isA<double>());
    });

    test('breakdown null when not provided', () {
      final m = FareEstimateModel.fromMap({
        'estimated_amount_ars': 500.0,
        'estimated_distance_m': 1000.0,
      });
      expect(m.breakdown, isNull);
    });
  });

  group('FareEstimateModel.distanceKm', () {
    test('3500m rounds to 4km', () {
      expect(
        FareEstimateModel(estimatedAmountArs: 0, estimatedDistanceM: 3500).distanceKm,
        4,
      );
    });

    test('500m rounds to 1km', () {
      expect(
        FareEstimateModel(estimatedAmountArs: 0, estimatedDistanceM: 500).distanceKm,
        1,
      );
    });

    test('0m is 0km', () {
      expect(
        FareEstimateModel(estimatedAmountArs: 0, estimatedDistanceM: 0).distanceKm,
        0,
      );
    });

    test('1000m rounds to 1km', () {
      expect(
        FareEstimateModel(estimatedAmountArs: 0, estimatedDistanceM: 1000).distanceKm,
        1,
      );
    });

    test('1500m rounds to 2km', () {
      expect(
        FareEstimateModel(estimatedAmountArs: 0, estimatedDistanceM: 1500).distanceKm,
        2,
      );
    });
  });

  group('FareEstimateModel.etaMinutes', () {
    test('clamps to minimum 3 minutes for very short trips', () {
      final m = FareEstimateModel(estimatedAmountArs: 0, estimatedDistanceM: 100);
      expect(m.etaMinutes, 3);
    });

    test('0m distance clamps to 3 minutes', () {
      final m = FareEstimateModel(estimatedAmountArs: 0, estimatedDistanceM: 0);
      expect(m.etaMinutes, 3);
    });

    test('1km at 300m/min is at least 3 minutes', () {
      final m = FareEstimateModel(estimatedAmountArs: 0, estimatedDistanceM: 1000);
      expect(m.etaMinutes, greaterThanOrEqualTo(3));
    });

    test('3000m at 300m/min = 10 minutes', () {
      final m = FareEstimateModel(estimatedAmountArs: 0, estimatedDistanceM: 3000);
      expect(m.etaMinutes, 10);
    });

    test('very long trip clamps to 60 minutes', () {
      final m = FareEstimateModel(estimatedAmountArs: 0, estimatedDistanceM: 100000);
      expect(m.etaMinutes, 60);
    });

    test('18000m (18km) = 60 minutes exactly, clamped', () {
      // 18000 / 300 = 60 — exactly at the upper clamp boundary
      final m = FareEstimateModel(estimatedAmountArs: 0, estimatedDistanceM: 18000);
      expect(m.etaMinutes, 60);
    });
  });
}
