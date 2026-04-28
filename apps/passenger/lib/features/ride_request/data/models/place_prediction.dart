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
