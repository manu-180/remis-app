class FareEstimateModel {
  const FareEstimateModel({
    required this.estimatedAmountArs,
    required this.estimatedDistanceM,
    this.breakdown,
  });

  final double estimatedAmountArs;
  final double estimatedDistanceM;
  final Map<String, dynamic>? breakdown;

  factory FareEstimateModel.fromMap(Map<String, dynamic> map) {
    return FareEstimateModel(
      estimatedAmountArs: (map['estimated_amount_ars'] as num?)?.toDouble() ?? 0.0,
      estimatedDistanceM: (map['estimated_distance_m'] as num?)?.toDouble() ?? 0.0,
      breakdown: map['breakdown'] as Map<String, dynamic>?,
    );
  }

  int get distanceKm => (estimatedDistanceM / 1000).round();

  /// Rough ETA in minutes at ~18 km/h average speed, clamped to [3, 60].
  int get etaMinutes => (estimatedDistanceM / 300).round().clamp(3, 60);
}
