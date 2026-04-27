import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/otp_screen.dart';
import '../../features/auth/presentation/screens/onboarding_name_screen.dart';
import '../../features/home/presentation/screens/home_screen.dart';
import '../../features/history/presentation/screens/history_screen.dart';
import '../../features/settings/presentation/screens/settings_screen.dart';
import '../../features/ride_request/data/models/driver_info_model.dart';
import '../../features/ride_request/data/models/ride_model.dart';
import '../../features/ride_request/data/ride_providers.dart';
import '../../features/ride_request/presentation/screens/waiting_screen.dart';
import '../../features/tracking/presentation/screens/tracking_screen.dart';
import '../../features/tracking/presentation/screens/trip_complete_screen.dart';

abstract final class AppRoutes {
  static const splash = '/';
  static const login = '/login';
  static const otp = '/otp';
  static const onboardingName = '/onboarding/name';
  static const home = '/home';
  static const history = '/history';
  static const settings = '/settings';
  static const waiting = '/waiting';
  static const tracking = '/tracking';
  static const tripComplete = '/trip-complete';
}

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: AppRoutes.splash,
    debugLogDiagnostics: false,
    routes: [
      GoRoute(
        path: AppRoutes.splash,
        builder: (_, __) => const SplashScreen(),
      ),
      GoRoute(
        path: AppRoutes.login,
        builder: (_, __) => const LoginScreen(),
      ),
      GoRoute(
        path: AppRoutes.otp,
        builder: (context, state) {
          final phone = state.extra as String? ?? '';
          return OtpScreen(phone: phone);
        },
      ),
      GoRoute(
        path: AppRoutes.onboardingName,
        builder: (_, __) => const OnboardingNameScreen(),
      ),
      GoRoute(
        path: AppRoutes.home,
        builder: (_, __) => const HomeScreen(),
      ),
      GoRoute(
        path: AppRoutes.history,
        builder: (_, __) => const HistoryScreen(),
      ),
      GoRoute(
        path: AppRoutes.settings,
        builder: (_, __) => const SettingsScreen(),
      ),
      GoRoute(
        path: AppRoutes.waiting,
        builder: (context, state) {
          final rideId = state.extra as String?;
          if (rideId == null) return const _RouteErrorScreen(message: 'Ride ID no encontrado');
          return WaitingScreen(rideId: rideId);
        },
      ),
      GoRoute(
        path: AppRoutes.tracking,
        builder: (context, state) {
          final extra = state.extra;
          if (extra is RideModel) {
            return TrackingScreen(initialRide: extra);
          }
          // Fallback: can't build without a ride — go home
          return const _RouteErrorScreen(message: 'Datos de viaje no disponibles');
        },
      ),
      GoRoute(
        path: '/tracking/:rideId',
        builder: (context, state) {
          // Deep link from FCM notification
          final rideId = state.pathParameters['rideId']!;
          return _RideLookupScreen(rideId: rideId);
        },
      ),
      GoRoute(
        path: AppRoutes.tripComplete,
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>?;
          if (extra == null) return const _RouteErrorScreen(message: 'Datos del viaje no disponibles');
          final ride = extra['ride'] as RideModel?;
          if (ride == null) return const _RouteErrorScreen(message: 'Datos del viaje no disponibles');
          final driver = extra['driver'] as DriverInfoModel?;
          return TripCompleteScreen(ride: ride, driver: driver);
        },
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(child: Text('Ruta no encontrada: ${state.uri}')),
    ),
  );
});

// ---------------------------------------------------------------------------
// Private helper screens — defined here to avoid cluttering feature folders
// ---------------------------------------------------------------------------

class _RouteErrorScreen extends StatelessWidget {
  const _RouteErrorScreen({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(child: Text(message)),
    );
  }
}

/// Resolves a rideId from a deep-link URL into a full [RideModel],
/// then replaces itself with [TrackingScreen].
class _RideLookupScreen extends ConsumerWidget {
  const _RideLookupScreen({required this.rideId});
  final String rideId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rideAsync = ref.watch(activeRideStreamProvider(rideId));
    return rideAsync.when(
      loading: () =>
          const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (e, _) =>
          Scaffold(body: Center(child: Text('Error: $e'))),
      data: (ride) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (context.mounted) {
            context.go(AppRoutes.tracking, extra: ride);
          }
        });
        return const Scaffold(body: Center(child: CircularProgressIndicator()));
      },
    );
  }
}
