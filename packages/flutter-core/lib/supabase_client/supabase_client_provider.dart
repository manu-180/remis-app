import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

part 'supabase_client_provider.g.dart';

@Riverpod(keepAlive: true)
SupabaseClient supabaseClient(Ref ref) {
  return Supabase.instance.client;
}

@Riverpod(keepAlive: true)
String? userId(Ref ref) {
  return Supabase.instance.client.auth.currentUser?.id;
}

@Riverpod(keepAlive: true)
Session? session(Ref ref) {
  return Supabase.instance.client.auth.currentSession;
}
