import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_background_geolocation/flutter_background_geolocation.dart' as bg;
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:remis_flutter_core/remis_flutter_core.dart';

class LocationService {
  static bool _ready = false;

  static Future<void> init({required Session session}) async {
    await bg.BackgroundGeolocation.ready(bg.Config(
      desiredAccuracy: bg.Config.DESIRED_ACCURACY_HIGH,
      distanceFilter: 20.0,
      stopTimeout: 5,
      heartbeatInterval: 30,
      locationAuthorizationRequest: 'Always',
      backgroundPermissionRationale: bg.PermissionRationale(
        title: 'Remís necesita tu ubicación todo el tiempo',
        message: 'Para enviarte pedidos cuando la app está en segundo plano.',
        positiveAction: 'Habilitar',
        negativeAction: 'Cancelar',
      ),
      stopOnTerminate: false,
      startOnBoot: true,
      enableHeadless: true,
      foregroundService: true,
      notification: bg.Notification(
        title: 'Remís Driver',
        text: 'Disponible para pedidos',
        smallIcon: 'drawable/ic_notification',
        sticky: true,
      ),
      url: '${Env.supabaseUrl}/rest/v1/driver_current_location',
      authorization: bg.Authorization(
        strategy: 'JWT',
        accessToken: session.accessToken,
        refreshUrl: '${Env.supabaseUrl}/auth/v1/token?grant_type=refresh_token',
        refreshToken: session.refreshToken ?? '',
        refreshPayload: {'refresh_token': '{refreshToken}'},
        expires: -1,
      ),
      headers: {
        'apikey': Env.supabaseAnonKey,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      locationTemplate: '''
      {
        "driver_id": "${session.user.id}",
        "location": "SRID=4326;POINT(<%= longitude %> <%= latitude %>)",
        "heading": <%= heading %>,
        "speed_mps": <%= speed %>,
        "accuracy_m": <%= accuracy %>,
        "battery_pct": <%= battery.level == -1 ? 0 : (battery.level * 100).round() %>,
        "status": "available",
        "updated_at": "<%= timestamp %>"
      }
      ''',
      autoSync: true,
      batchSync: true,
      autoSyncThreshold: 5,
      maxRecordsToPersist: 1000,
      preventSuspend: true,
      activityType: bg.Config.ACTIVITY_TYPE_AUTOMOTIVE_NAVIGATION,
      debug: kDebugMode,
      logLevel: kDebugMode
          ? bg.Config.LOG_LEVEL_VERBOSE
          : bg.Config.LOG_LEVEL_ERROR,
    ));
    _ready = true;
  }

  static Future<void> start() async {
    final state = await bg.BackgroundGeolocation.state;
    if (!state.enabled) {
      await bg.BackgroundGeolocation.start();
    }
  }

  static Future<void> stop() => bg.BackgroundGeolocation.stop();

  static Future<bg.Location?> getCurrentLocation() async {
    if (!_ready) return null;
    try {
      return await bg.BackgroundGeolocation.getCurrentPosition(
        timeout: 30,
        maximumAge: 5000,
        desiredAccuracy: 10,
        samples: 1,
      );
    } catch (_) {
      return null;
    }
  }

  static void enableRealtimeBroadcast({
    required RealtimeClient realtime,
    required String driverId,
  }) {
    bg.BackgroundGeolocation.onLocation((location) {
      realtime.channel('driver:locations').sendBroadcastMessage(
        event: 'pos',
        payload: {
          'driver_id': driverId,
          'lat': location.coords.latitude,
          'lng': location.coords.longitude,
          'heading': location.coords.heading,
          'speed_mps': location.coords.speed,
          'recorded_at': location.timestamp,
        },
      );
    });
  }

  static void enableHeartbeat({
    required String driverId,
    required String supabaseUrl,
    required String supabaseAnonKey,
    required String accessToken,
  }) {
    bg.BackgroundGeolocation.onHeartbeat((_) async {
      final loc = await getCurrentLocation();
      await http.post(
        Uri.parse('$supabaseUrl/functions/v1/driver-heartbeat'),
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': 'Bearer $accessToken',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'driver_id': driverId,
          'battery': loc?.battery.level ?? -1,
          'status': 'available',
          if (loc != null)
            'last_known_location': {
              'lat': loc.coords.latitude,
              'lng': loc.coords.longitude,
            },
        }),
      );
    });
  }
}
