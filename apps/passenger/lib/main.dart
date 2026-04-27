import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';
import 'core/env/env.dart';
import 'core/notifications/fcm_service.dart';
import 'core/notifications/notification_router.dart';
import 'core/routing/app_router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: Env.supabaseUrl,
    anonKey: Env.supabaseAnonKey,
  );

  // FCM is wired up via a ProviderScope override so the service can read
  // the GoRouter instance without a circular dependency. The actual
  // initialize() call is deferred to after the user authenticates — the
  // stub implementation is a no-op when called unauthenticated, so calling
  // it here is safe for future readiness.
  runApp(
    ProviderScope(
      observers: [_FcmInitObserver()],
      child: const PassengerApp(),
    ),
  );
}

/// Riverpod observer that initialises [FcmService] once the container is
/// ready and wires up the notification-tap → GoRouter deep-link handler.
///
/// Using an observer avoids the need to look up providers in [main] before
/// [ProviderScope] is mounted, and keeps [main] minimal.
class _FcmInitObserver extends ProviderObserver {
  @override
  void didAddProvider(
    ProviderBase<Object?> provider,
    Object? value,
    ProviderContainer container,
  ) {
    // Initialise FCM exactly once, when the fcmServiceProvider is first read.
    if (provider == fcmServiceProvider) {
      final fcmService = container.read(fcmServiceProvider);
      final router    = container.read(appRouterProvider);

      fcmService.setOnTap((type, rideId) {
        handleNotificationTap(type: type, rideId: rideId, router: router);
      });

      // Deferred: initialize() is a stub now; becomes real in tanda-4.
      // It guards internally against unauthenticated state.
      fcmService.initialize();
    }
  }
}
