import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:remis_flutter_core/remis_flutter_core.dart';

class LocationService {
  static StreamSubscription<Position>? _positionSub;
  static StreamSubscription<Position>? _realtimeSub;
  static Timer? _heartbeatTimer;

  // Broadcast stream que recibe todas las posiciones GPS.
  // Vive durante toda la vida de la app; no se cierra al hacer stop().
  static final _positionController = StreamController<Position>.broadcast();

  static bool _ready = false;

  // Credenciales para el sync a Supabase (se llenan en init)
  static String? _driverId;
  static String? _supabaseUrl;
  static String? _supabaseAnonKey;
  static String? _accessToken;

  /// Stream público de posiciones GPS. Usarlo para escuchar ubicaciones
  /// (reemplaza BackgroundGeolocation.onLocation).
  static Stream<Position> get positionStream => _positionController.stream;

  static Future<void> init({required Session session}) async {
    _driverId = session.user.id;
    _supabaseUrl = Env.supabaseUrl;
    _supabaseAnonKey = Env.supabaseAnonKey;
    _accessToken = session.accessToken;
    _ready = true;
  }

  static Future<void> start() async {
    if (!_ready) return;

    final locationSettings = AndroidSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 20,
      foregroundNotificationConfig: ForegroundNotificationConfig(
        notificationText: 'Disponible para pedidos',
        notificationTitle: 'Remís Driver',
        enableWakeLock: true,
        notificationIcon: const AndroidResource(
          name: 'ic_notification',
          defType: 'drawable',
        ),
      ),
    );

    _positionSub = Geolocator.getPositionStream(
      locationSettings: defaultTargetPlatform == TargetPlatform.android
          ? locationSettings
          : const LocationSettings(
              accuracy: LocationAccuracy.high,
              distanceFilter: 20,
            ),
    ).listen((position) {
      _positionController.add(position);
      _syncLocation(position);
    });
  }

  static Future<void> _syncLocation(Position pos) async {
    final url = _supabaseUrl;
    final anonKey = _supabaseAnonKey;
    final token = _accessToken;
    final driverId = _driverId;
    if (url == null || anonKey == null || token == null || driverId == null) {
      return;
    }
    try {
      await http.post(
        Uri.parse('$url/rest/v1/driver_current_location'),
        headers: {
          'apikey': anonKey,
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
        },
        body: jsonEncode({
          'driver_id': driverId,
          'location': 'SRID=4326;POINT(${pos.longitude} ${pos.latitude})',
          'heading': pos.heading,
          'speed_mps': pos.speed,
          'accuracy_m': pos.accuracy,
          'battery_pct': 0,
          'status': 'available',
          'updated_at': pos.timestamp.toIso8601String(),
        }),
      );
    } catch (_) {}
  }

  static Future<void> stop() async {
    _positionSub?.cancel();
    _positionSub = null;
    _realtimeSub?.cancel();
    _realtimeSub = null;
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
    _ready = false;
    _driverId = null;
    _supabaseUrl = null;
    _supabaseAnonKey = null;
    _accessToken = null;
  }

  static Future<Position?> getCurrentLocation() async {
    try {
      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 30),
        ),
      );
    } catch (_) {
      return null;
    }
  }

  static void enableRealtimeBroadcast({
    required RealtimeClient realtime,
    required String driverId,
  }) {
    _realtimeSub = positionStream.listen((position) {
      realtime.channel('driver:locations').sendBroadcastMessage(
        event: 'pos',
        payload: {
          'driver_id': driverId,
          'lat': position.latitude,
          'lng': position.longitude,
          'heading': position.heading,
          'speed_mps': position.speed,
          'recorded_at': position.timestamp.toIso8601String(),
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
    _heartbeatTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) async {
        final loc = await getCurrentLocation();
        try {
          await http.post(
            Uri.parse('$supabaseUrl/functions/v1/driver-heartbeat'),
            headers: {
              'apikey': supabaseAnonKey,
              'Authorization': 'Bearer $accessToken',
              'Content-Type': 'application/json',
            },
            body: jsonEncode({
              'driver_id': driverId,
              'battery': -1,
              'status': 'available',
              if (loc != null)
                'last_known_location': {
                  'lat': loc.latitude,
                  'lng': loc.longitude,
                },
            }),
          );
        } catch (_) {}
      },
    );
  }
}
