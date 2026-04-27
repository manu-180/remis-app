class Env {
  Env._();

  // These are injected at build time via --dart-define-from-file
  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');
  static const googleMapsApiKey =
      String.fromEnvironment('GOOGLE_MAPS_API_KEY', defaultValue: '');
  static const mpPublicKey =
      String.fromEnvironment('MP_PUBLIC_KEY', defaultValue: '');
  static const sentryDsn =
      String.fromEnvironment('SENTRY_DSN', defaultValue: '');
  static const environment =
      String.fromEnvironment('ENVIRONMENT', defaultValue: 'dev');

  static bool get isDev => environment == 'dev';
  static bool get isStaging => environment == 'stg';
  static bool get isProd => environment == 'prd';

  static void validate() {
    assert(supabaseUrl.isNotEmpty, 'SUPABASE_URL must be defined');
    assert(supabaseAnonKey.isNotEmpty, 'SUPABASE_ANON_KEY must be defined');
  }
}
