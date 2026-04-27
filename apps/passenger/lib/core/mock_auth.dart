// Temporary mock auth used until flutter-core/auth/ is delivered by 2A.
// Migrate to flutter-core auth package when 2A merges.
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

final supabaseClientProvider = Provider<SupabaseClient>(
  (_) => Supabase.instance.client,
);

final authStateChangesProvider = StreamProvider<AuthState>(
  (ref) => ref.watch(supabaseClientProvider).auth.onAuthStateChange,
);

final currentUserProvider = Provider<User?>(
  (ref) => ref.watch(supabaseClientProvider).auth.currentUser,
);

Future<void> signInWithOtp({
  required String phone,
  required SupabaseClient client,
}) async {
  await client.auth.signInWithOtp(
    phone: phone,
    shouldCreateUser: true,
  );
}

Future<void> verifyOtp({
  required String phone,
  required String token,
  required SupabaseClient client,
}) async {
  await client.auth.verifyOTP(
    phone: phone,
    token: token,
    type: OtpType.sms,
  );
}

Future<void> signOut(SupabaseClient client) async {
  await client.auth.signOut();
}
