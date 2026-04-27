import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:remis_driver/features/auth/presentation/screens/splash_screen.dart';
import 'package:remis_driver/features/auth/presentation/screens/phone_login_screen.dart';
import 'package:remis_driver/features/auth/presentation/screens/otp_verify_screen.dart';
import 'package:remis_driver/features/home/presentation/screens/home_screen.dart';
import 'package:remis_driver/features/settings/presentation/screens/settings_screen.dart';

final appRouter = GoRouter(
  initialLocation: '/splash',
  redirect: (context, state) {
    final session = Supabase.instance.client.auth.currentSession;
    final path = state.fullPath ?? '';

    if (path == '/splash') return null;

    final isAuthRoute = path.startsWith('/auth');
    if (session == null && !isAuthRoute) return '/auth/login';
    if (session != null && isAuthRoute) return '/home';
    return null;
  },
  routes: [
    GoRoute(
      path: '/splash',
      builder: (_, __) => const SplashScreen(),
    ),
    GoRoute(
      path: '/auth/login',
      builder: (_, __) => const PhoneLoginScreen(),
    ),
    GoRoute(
      path: '/auth/otp',
      builder: (_, state) => OtpVerifyScreen(
        phone: state.uri.queryParameters['phone'] ?? '',
      ),
    ),
    GoRoute(
      path: '/home',
      builder: (_, __) => const HomeScreen(),
    ),
    GoRoute(
      path: '/settings',
      builder: (_, __) => const SettingsScreen(),
    ),
  ],
);
