import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

final currentUserProvider = Provider<User?>(
  (ref) => Supabase.instance.client.auth.currentUser,
);
