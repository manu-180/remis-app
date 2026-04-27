import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:posthog_flutter/posthog_flutter.dart';
import 'package:sentry_flutter/sentry_flutter.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';
import 'core/env/env.dart';
import 'core/notifications/fcm_service.dart';
import 'core/notifications/notification_router.dart';
import 'core/routing/app_router.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: Env.supabaseUrl,
    anonKey: Env.supabaseAnonKey,
  );

  if (Env.posthogKey.isNotEmpty) {
    final config = PostHogConfig(Env.posthogKey)
      ..host = 'https://us.i.posthog.com'
      ..captureApplicationLifecycleEvents = true
      ..sessionReplay = true
      ..sessionReplayConfig = (PostHogSessionReplayConfig()
        ..maskAllTextInputs = true
        ..maskAllImages = false)
      ..debug = !Env.isProd;
    await Posthog().setup(config);
  }

  await SentryFlutter.init(
    (options) {
      options.dsn = Env.sentryDsn;
      options.tracesSampleRate = Env.isProd ? 0.1 : 1.0;
      options.profilesSampleRate = 0.1;
      options.environment = Env.environment;
      options.release = 'remis-passenger@1.0.0+1';
      options.enableAutoSessionTracking = true;
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
      ProviderScope(
        observers: [_FcmInitObserver()],
        child: const PassengerApp(),
      ),
    ),
  );
}

class _FcmInitObserver extends ProviderObserver {
  @override
  void didAddProvider(
    ProviderBase<Object?> provider,
    Object? value,
    ProviderContainer container,
  ) {
    if (provider == fcmServiceProvider) {
      try {
        final fcmService = container.read(fcmServiceProvider);
        final router    = container.read(appRouterProvider);

        fcmService.setOnTap((type, rideId) {
          handleNotificationTap(type: type, rideId: rideId, router: router);
        });

        fcmService.initialize();
      } catch (e) {
        debugPrint('[FcmService] FCM init failed: $e');
      }
    }
  }
}
