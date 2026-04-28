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
