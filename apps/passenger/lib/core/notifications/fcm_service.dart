// FCM token registration and notification handling for the passenger app.
// Server-side FCM dispatch is handled by Supabase Edge Functions triggered
// by pg_net HTTP calls from DB triggers (see migrations/20260426000040).
//
// The server sends two notification types relevant to passengers:
//   - 'ride_assigned'  → when a driver accepts the passenger's ride request
//   - 'ride_completed' → when the driver marks the trip as completed
//
// Additional types handled client-side via Supabase Realtime (activeRideStreamProvider):
//   - driver_arrived, trip_started, ride_cancelled
//
// Client-side: request permission, get FCM token, store in profiles.fcm_token.
// Actual Firebase initialization requires adding firebase_messaging to pubspec
// and running `flutterfire configure`. Until then this is a documented stub.

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../mock_auth.dart';

// ---------------------------------------------------------------------------
// Notification type enum
// ---------------------------------------------------------------------------

/// Notification payload types expected in the FCM data field.
///
/// Server triggers (20260426000040) dispatch:
///   - ride_assigned   (body: {ride_id, driver_id, type})
///   - ride_completed  (body: {ride_id, passenger_id, type, final_fare})
///
/// Types below also cover client-driven state changes observed via Realtime,
/// so the deep-link router has a complete picture regardless of delivery path.
enum NotificationType {
  rideAssigned,
  driverArrived,
  tripStarted,
  tripEnded,
  rideCancelled;

  static NotificationType? fromString(String? s) => switch (s) {
    'ride_assigned'   => NotificationType.rideAssigned,
    'driver_arrived'  => NotificationType.driverArrived,
    'trip_started'    => NotificationType.tripStarted,
    'trip_ended'      => NotificationType.tripEnded,
    // 'ride_completed' is the server-side name; map it to tripEnded for the router
    'ride_completed'  => NotificationType.tripEnded,
    'ride_cancelled'  => NotificationType.rideCancelled,
    _                 => null,
  };
}

// ---------------------------------------------------------------------------
// Tap handler typedef
// ---------------------------------------------------------------------------

/// Called when the user taps a push notification.
/// [type] identifies the notification category; [rideId] is the relevant ride.
typedef NotificationTapHandler = void Function(
  NotificationType type,
  String rideId,
);

// ---------------------------------------------------------------------------
// FcmService
// ---------------------------------------------------------------------------

class FcmService {
  FcmService(this._client);

  final SupabaseClient _client;
  NotificationTapHandler? _onTap;
  bool _initialized = false;

  /// Register a handler that is called when the user taps a notification.
  void setOnTap(NotificationTapHandler handler) => _onTap = handler;

  /// Initialise FCM: request permission, retrieve token, persist to Supabase.
  ///
  /// Call this after the user is authenticated (e.g. from SplashScreen or
  /// after verifying OTP). Safe to call when unauthenticated — it returns
  /// early without side-effects.
  ///
  /// NOTE(tanda-4): This is a stub. To complete the real implementation:
  ///   1. Add `firebase_messaging: ^15.x.x` to pubspec.yaml
  ///   2. Run `flutterfire configure` to generate firebase_options.dart
  ///   3. Add google-services.json (Android) & GoogleService-Info.plist (iOS)
  ///   4. Uncomment the implementation block below and remove the stub body.
  Future<void> initialize() async {
    if (_initialized) return;
    _initialized = true;

    if (_client.auth.currentUser == null) {
      debugPrint('[FcmService] User not authenticated — skipping FCM init.');
      return;
    }

    // TODO(tanda-4): Replace stub with real Firebase initialisation:
    //
    // await Firebase.initializeApp(
    //   options: DefaultFirebaseOptions.currentPlatform,
    // );
    //
    // final messaging = FirebaseMessaging.instance;
    // final settings = await messaging.requestPermission(
    //   alert: true,
    //   badge: true,
    //   sound: true,
    // );
    // debugPrint('[FcmService] Permission: ${settings.authorizationStatus}');
    //
    // final token = await messaging.getToken();
    // if (token != null) await _storeFcmToken(token);
    //
    // // Refresh token when it rotates
    // messaging.onTokenRefresh.listen(_storeFcmToken);
    //
    // // Foreground messages (show in-app banner or snackbar)
    // FirebaseMessaging.onMessage.listen(_handleForeground);
    //
    // // Background/terminated tap: navigate on open
    // FirebaseMessaging.onMessageOpenedApp.listen(_handleTap);
    //
    // // App opened from terminated state via notification
    // final initial = await messaging.getInitialMessage();
    // if (initial != null) _handleTap(initial);

    debugPrint(
      '[FcmService] Stub active — firebase_messaging not yet added. '
      'Supabase Realtime is the primary notification channel.',
    );
  }

  // -------------------------------------------------------------------------
  // Private helpers (used once firebase_messaging is added)
  // -------------------------------------------------------------------------

  // ignore: unused_element — called from the firebase_messaging block (tanda-4)
  Future<void> _storeFcmToken(String token) async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) return;
      await _client
          .from('profiles')
          .update({'fcm_token': token})
          .eq('id', userId);
      debugPrint('[FcmService] FCM token stored for user $userId.');
    } catch (e) {
      // Non-fatal: Realtime remains the fallback.
      debugPrint('[FcmService] Could not store FCM token: $e');
    }
  }

  // void _handleForeground(RemoteMessage message) {
  //   debugPrint('[FcmService] Foreground message: ${message.data}');
  //   // Show in-app snackbar / local notification here.
  // }

  // void _handleTap(RemoteMessage message) {
  //   handleNotificationPayload(message.data);
  // }

  // -------------------------------------------------------------------------
  // Public payload parser (can be called manually from notification_router)
  // -------------------------------------------------------------------------

  /// Parse a notification [data] map (from FCM's data field) and invoke the
  /// registered [NotificationTapHandler] if the payload is well-formed.
  ///
  /// Expected keys: `type` (string), `ride_id` (string).
  void handleNotificationPayload(Map<String, dynamic> data) {
    final typeStr = data['type'] as String?;
    final rideId  = data['ride_id'] as String?;

    final type = NotificationType.fromString(typeStr);
    if (type == null) {
      debugPrint('[FcmService] Unknown notification type: $typeStr');
      return;
    }
    if (rideId == null) {
      debugPrint('[FcmService] Missing ride_id in payload: $data');
      return;
    }

    debugPrint('[FcmService] Notification tapped — type: $type, ride: $rideId');
    if (type != null && rideId != null && _onTap != null) {
      try {
        _onTap!(type, rideId);
      } catch (e) {
        debugPrint('[FcmService] Notification tap handler error: $e');
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Riverpod provider
// ---------------------------------------------------------------------------

final fcmServiceProvider = Provider<FcmService>((ref) {
  final client = ref.watch(supabaseClientProvider);
  return FcmService(client);
});
