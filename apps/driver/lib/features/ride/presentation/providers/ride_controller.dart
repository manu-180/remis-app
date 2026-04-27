import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:remis_driver/features/ride/data/ride_model.dart';
import 'package:remis_driver/features/ride/data/ride_repository.dart';

part 'ride_controller.g.dart';

sealed class RideState {
  const RideState();
}

final class RideStateIdle extends RideState {
  const RideStateIdle();
}

final class RideStateIncomingOffer extends RideState {
  const RideStateIncomingOffer(this.offer);
  final RideModel offer;
}

final class RideStateAccepting extends RideState {
  const RideStateAccepting();
}

final class RideStateActive extends RideState {
  const RideStateActive(this.ride);
  final RideModel ride;
}

final class RideStateCompleted extends RideState {
  const RideStateCompleted(this.ride);
  final RideModel ride;
}

final class RideStateError extends RideState {
  const RideStateError(this.message);
  final String message;
}

@riverpod
Stream<RideModel?> incomingOfferStream(Ref ref) {
  final driverId = Supabase.instance.client.auth.currentUser!.id;
  return DriverRideRepository(Supabase.instance.client)
      .watchIncomingOffer(driverId);
}

@riverpod
Stream<RideModel?> activeRideStream(Ref ref) {
  final driverId = Supabase.instance.client.auth.currentUser!.id;
  return DriverRideRepository(Supabase.instance.client)
      .watchActiveRide(driverId);
}

@riverpod
class RideController extends _$RideController {
  DriverRideRepository get _repo =>
      DriverRideRepository(Supabase.instance.client);

  String get _uid => Supabase.instance.client.auth.currentUser!.id;

  StreamSubscription<RideModel?>? _offerSub;
  StreamSubscription<RideModel?>? _activeSub;

  @override
  RideState build() {
    ref.onDispose(() {
      _offerSub?.cancel();
      _activeSub?.cancel();
    });
    return const RideStateIdle();
  }

  void listenForOffers() {
    _offerSub?.cancel();
    _offerSub = _repo.watchIncomingOffer(_uid).listen(
      (offer) {
        if (offer != null && state is RideStateIdle) {
          state = RideStateIncomingOffer(offer);
        } else if (offer == null && state is RideStateIncomingOffer) {
          state = const RideStateIdle();
        }
      },
      onError: (Object e) {
        state = RideStateError('Error recibiendo oferta: $e');
      },
    );
  }

  void listenForActiveRide() {
    _activeSub?.cancel();
    _activeSub = _repo.watchActiveRide(_uid).listen(
      (ride) {
        if (ride == null) return;
        if (ride.status.isTerminal) {
          state = RideStateCompleted(ride);
        } else {
          state = RideStateActive(ride);
        }
      },
      onError: (Object e) {
        state = RideStateError('Error en viaje activo: $e');
      },
    );
  }

  Future<void> acceptOffer(String rideId) async {
    state = const RideStateAccepting();
    try {
      await _repo.acceptRide(rideId, _uid);
      listenForActiveRide();
    } catch (e) {
      state = RideStateError('No se pudo aceptar el viaje: $e');
    }
  }

  Future<void> rejectOffer(String rideId) async {
    try {
      await _repo.rejectRide(rideId);
      state = const RideStateIdle();
    } catch (e) {
      state = RideStateError('No se pudo rechazar el viaje: $e');
    }
  }

  Future<void> markEnRoute() async {
    final current = state;
    if (current is! RideStateActive) return;
    try {
      await _repo.markEnRoute(current.ride.id);
    } catch (e) {
      state = RideStateError('Error al marcar en camino: $e');
    }
  }

  Future<void> markArrived() async {
    final current = state;
    if (current is! RideStateActive) return;
    try {
      await _repo.markArrived(current.ride.id);
    } catch (e) {
      state = RideStateError('Error al marcar llegada: $e');
    }
  }

  Future<void> startTrip() async {
    final current = state;
    if (current is! RideStateActive) return;
    try {
      await _repo.startTrip(current.ride.id);
    } catch (e) {
      state = RideStateError('Error al iniciar viaje: $e');
    }
  }

  Future<void> endTrip({double? distanceMeters, double? fareArs}) async {
    final current = state;
    if (current is! RideStateActive) return;
    try {
      await _repo.endTrip(
        current.ride.id,
        distanceMeters: distanceMeters,
        fareArs: fareArs,
      );
    } catch (e) {
      state = RideStateError('Error al finalizar viaje: $e');
    }
  }

  Future<void> cancelRide() async {
    final current = state;
    final rideId = switch (current) {
      RideStateActive(:final ride) => ride.id,
      RideStateIncomingOffer(:final offer) => offer.id,
      _ => null,
    };
    if (rideId == null) return;
    try {
      await _repo.cancelRide(rideId);
      state = const RideStateIdle();
    } catch (e) {
      state = RideStateError('Error al cancelar viaje: $e');
    }
  }

}
