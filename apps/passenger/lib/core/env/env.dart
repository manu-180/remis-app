/// Environment variables loaded via --dart-define-from-file=env/dev.json
/// Never hardcode secrets here.
abstract final class Env {
  static const supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'http://localhost:54321',
  );

  static const supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: '',
  );

  static const googleMapsApiKey = String.fromEnvironment(
    'GOOGLE_MAPS_API_KEY',
    defaultValue: '',
  );

  static const sentryDsn = String.fromEnvironment('SENTRY_DSN', defaultValue: '');
  static const posthogKey = String.fromEnvironment('POSTHOG_KEY', defaultValue: '');
  static const environment = String.fromEnvironment('ENVIRONMENT', defaultValue: 'dev');

  static bool get isProd => environment == 'prd';
}
