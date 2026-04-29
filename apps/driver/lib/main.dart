import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_background_geolocation/flutter_background_geolocation.dart' as bg;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sentry_flutter/sentry_flutter.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:remis_flutter_core/remis_flutter_core.dart';
import 'package:remis_driver/app.dart';

@pragma('vm:entry-point')
void _bgHeadlessTask(bg.HeadlessEvent event) async {
  // Location events in headless mode (app terminated) — plugin auto-syncs via url config
}

void main() async {
  // Must be called before WidgetsFlutterBinding.ensureInitialized()
  bg.BackgroundGeolocation.registerHeadlessTask(_bgHeadlessTask);
  WidgetsFlutterBinding.ensureInitialized();

  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
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

  await SentryFlutter.init(
    (options) {
      options.dsn = Env.sentryDsn;
      options.tracesSampleRate = Env.isProd ? 0.1 : 1.0;
      options.profilesSampleRate = 0.1;
      options.environment = Env.environment;
      options.release = 'remis-driver@0.1.0+1';
      options.enableAutoSessionTracking = true;
      options.enableWatchdogTerminationTracking = true;
      options.anrEnabled = true;
      options.beforeSend = (event, hint) {
        if (event.user != null) {
          return event.copyWith(
            user: event.user!.copyWith(email: null, ipAddress: null),
          );
        }
        return event;
      };
    },
    appRunner: () => runApp(
      DefaultAssetBundle(
        bundle: SentryAssetBundle(),
        child: const ProviderScope(child: DriverApp()),
      ),
    ),
  );
}
