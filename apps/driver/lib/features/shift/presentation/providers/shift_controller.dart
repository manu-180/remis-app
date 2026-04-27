import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:remis_flutter_core/remis_flutter_core.dart';
import 'package:remis_driver/features/shift/data/location_service.dart';
import 'package:remis_driver/features/shift/data/shift_repository.dart';
import 'package:remis_driver/shared/widgets/driver_status_pill.dart';

part 'shift_controller.g.dart';

sealed class ShiftState {
  const ShiftState();
}

final class ShiftIdle extends ShiftState {
  const ShiftIdle();
}

final class ShiftLoading extends ShiftState {
  const ShiftLoading();
}

final class ShiftActive extends ShiftState {
  const ShiftActive(this.status);
  final DriverStatus status;
}

final class ShiftError extends ShiftState {
  const ShiftError(this.message);
  final String message;
}

@riverpod
class ShiftController extends _$ShiftController {
  @override
  ShiftState build() => const ShiftIdle();

  ShiftRepository get _repo =>
      ShiftRepository(Supabase.instance.client);

  String get _uid => Supabase.instance.client.auth.currentUser!.id;

  Future<void> startShift() async {
    state = const ShiftLoading();
    try {
      final expired = await _repo.getExpiredDocuments(_uid);
      if (expired.isNotEmpty) {
        state = ShiftError(
          'Tenés documentos vencidos: ${expired.map((d) => d['document_type']).join(', ')}. Contactá a la agencia.',
        );
        return;
      }

      final session = Supabase.instance.client.auth.currentSession!;
      final driverRow = await Supabase.instance.client
          .from('drivers')
          .select('agency_id')
          .eq('id', _uid)
          .single();
      final agencyId = (driverRow['agency_id'] as String?) ?? '';

      await LocationService.init(session: session, agencyId: agencyId);
      await LocationService.start();
      LocationService.enableRealtimeBroadcast(
        agencyId: agencyId,
        realtime: Supabase.instance.client.realtime,
        driverId: _uid,
      );
      LocationService.enableHeartbeat(
        driverId: _uid,
        supabaseUrl: Env.supabaseUrl,
        supabaseAnonKey: Env.supabaseAnonKey,
        accessToken: session.accessToken,
      );
      await _repo.startShift(_uid);
      state = const ShiftActive(DriverStatus.available);
    } catch (e) {
      state = ShiftError('No se pudo iniciar el turno. $e');
    }
  }

  Future<void> pauseShift() async {
    state = const ShiftLoading();
    try {
      await _repo.pauseShift(_uid);
      state = const ShiftActive(DriverStatus.onBreak);
    } catch (e) {
      state = ShiftError('No se pudo pausar el turno. $e');
    }
  }

  Future<void> resumeShift() async {
    state = const ShiftLoading();
    try {
      await _repo.resumeShift(_uid);
      state = const ShiftActive(DriverStatus.available);
    } catch (e) {
      state = ShiftError('No se pudo reanudar el turno. $e');
    }
  }

  Future<Map<String, dynamic>?> endShift() async {
    state = const ShiftLoading();
    try {
      await LocationService.stop();
      await _repo.endShift(_uid);
      final summary = await _repo.getShiftSummary(_uid);
      state = const ShiftIdle();
      return summary;
    } catch (e) {
      state = ShiftError('No se pudo terminar el turno. $e');
      return null;
    }
  }
}
