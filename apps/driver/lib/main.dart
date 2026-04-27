import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:remis_flutter_core/remis_flutter_core.dart';
import 'package:remis_driver/app.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Edge-to-edge display
  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);

  // Only portrait — driver app doesn't support landscape
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  Env.validate();

  await Supabase.initialize(
    url: Env.supabaseUrl,
    anonKey: Env.supabaseAnonKey,
    debug: Env.isDev,
  );

  runApp(
    const ProviderScope(
      child: DriverApp(),
    ),
  );
}
