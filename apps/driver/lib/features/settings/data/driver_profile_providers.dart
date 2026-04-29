import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:remis_driver/features/settings/data/driver_profile_repository.dart';

final driverProfileRepoProvider = Provider<DriverProfileRepository>(
  (_) => DriverProfileRepository(Supabase.instance.client),
);

final driverProfileProvider = FutureProvider<Map<String, dynamic>?>((ref) {
  final uid = Supabase.instance.client.auth.currentUser?.id;
  if (uid == null) return null;
  return ref.read(driverProfileRepoProvider).getDriverWithVehicle(uid);
});

final driverDocumentsProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) {
  final uid = Supabase.instance.client.auth.currentUser?.id;
  if (uid == null) return [];
  return ref.read(driverProfileRepoProvider).getDocuments(uid);
});
