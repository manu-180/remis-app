import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum SoundEffect {
  rideOffer,
  rideAccepted,
  rideOfferLost,
  arrived,
  tripStarted,
  tripEnded,
  sosTriggered,
}

extension _SoundEffectAsset on SoundEffect {
  String get asset => switch (this) {
        SoundEffect.rideOffer => 'assets/sounds/pedido_nuevo.mp3',
        SoundEffect.rideAccepted => 'assets/sounds/confirm_soft.mp3',
        SoundEffect.rideOfferLost => 'assets/sounds/pedido_perdido.mp3',
        SoundEffect.arrived => 'assets/sounds/confirm_soft.mp3',
        SoundEffect.tripStarted => 'assets/sounds/confirm_soft.mp3',
        SoundEffect.tripEnded => 'assets/sounds/confirm_soft.mp3',
        SoundEffect.sosTriggered => 'assets/sounds/sos_alert.mp3',
      };
}

class DriverAudio {
  DriverAudio._();

  static final AudioPlayer _player = AudioPlayer();
  static bool _muted = false;

  static const String _mutedKey = 'audio_muted';

  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _muted = prefs.getBool(_mutedKey) ?? false;
    await _player.setReleaseMode(ReleaseMode.stop);
  }

  static Future<void> play(SoundEffect e) async {
    await _haptic(e);
    if (_muted) return;
    try {
      await _player.stop();
      await _player.play(AssetSource(e.asset.replaceFirst('assets/', '')));
    } catch (_) {}
  }

  static Future<void> _haptic(SoundEffect e) async {
    switch (e) {
      case SoundEffect.rideOffer:
        await HapticFeedback.heavyImpact();
        await _vibratePattern([0, 200, 100, 200, 100, 200]);
      case SoundEffect.rideAccepted:
        await HapticFeedback.mediumImpact();
      case SoundEffect.arrived:
        await HapticFeedback.lightImpact();
      case SoundEffect.tripStarted:
        await HapticFeedback.lightImpact();
      case SoundEffect.tripEnded:
        await HapticFeedback.mediumImpact();
      case SoundEffect.rideOfferLost:
        await HapticFeedback.lightImpact();
      case SoundEffect.sosTriggered:
        await HapticFeedback.heavyImpact();
    }
  }

  static Future<void> _vibratePattern(List<int> pattern) async {
    try {
      const channel = MethodChannel('flutter/platform');
      await channel.invokeMethod<void>('HapticFeedback.vibrate');
    } catch (_) {}

    int delay = 0;
    for (int i = 0; i < pattern.length; i++) {
      final duration = pattern[i];
      if (duration == 0) {
        delay = 0;
        continue;
      }
      await Future.delayed(Duration(milliseconds: delay));
      if (i.isOdd) {
        await HapticFeedback.heavyImpact();
      }
      delay = duration;
    }
  }

  static Future<void> setMuted(bool value) async {
    _muted = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_mutedKey, value);
  }

  static bool get isMuted => _muted;
}
