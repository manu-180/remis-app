// Maps FCM notification types to GoRouter navigation targets.
// Called by FcmService when the user taps a push notification (or when a
// notification payload is received while the app is in the foreground).
//
// Route table:
//   rideAssigned  → /tracking/:rideId  (driver on the way)
//   driverArrived → /tracking/:rideId  (driver is outside)
//   tripStarted   → /tracking/:rideId  (trip in progress)
//   tripEnded     → /home              (trip complete, fare shown by tracking screen)
//   rideCancelled → /home              (back to request flow)

import 'package:go_router/go_router.dart';

import 'fcm_service.dart';

/// Route an FCM notification tap to the correct screen.
///
/// [type]    — the parsed [NotificationType] from the notification payload.
/// [rideId]  — the ride UUID carried in the payload's `ride_id` field.
/// [router]  — the app's [GoRouter] instance (from [appRouterProvider]).
void handleNotificationTap({
  required NotificationType type,
  required String rideId,
  required GoRouter router,
}) {
  switch (type) {
    case NotificationType.rideAssigned:
    case NotificationType.driverArrived:
    case NotificationType.tripStarted:
      // Show the live tracking screen for the given ride.
      router.go('/tracking/$rideId');

    case NotificationType.tripEnded:
      // The tracking screen detects completion via Realtime and shows the
      // summary; navigating home is the safe fallback from a cold-start tap.
      router.go('/home');

    case NotificationType.rideCancelled:
      // Return user to the home / request flow.
      router.go('/home');
  }
}
