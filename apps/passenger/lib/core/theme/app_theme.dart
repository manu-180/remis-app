import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Design tokens — "Premium Pampeano"
/// Source: packages/design-system/tokens.json
abstract final class AppColors {
  // Brand
  static const brandPrimary = Color(0xFF1B2A4E);
  static const brandPrimaryDark = Color(0xFF7CA0FF);
  static const brandAccent = Color(0xFFD97706);
  static const brandAccentDark = Color(0xFFF59E0B);

  // Neutrals (light)
  static const neutral0 = Color(0xFFFFFFFF);
  static const neutral50 = Color(0xFFFAFAFA);
  static const neutral100 = Color(0xFFF4F4F5);
  static const neutral200 = Color(0xFFE4E4E7);
  static const neutral300 = Color(0xFFD4D4D8);
  static const neutral400 = Color(0xFFA1A1AA);
  static const neutral500 = Color(0xFF71717A);
  static const neutral800 = Color(0xFF27272A);
  static const neutral900 = Color(0xFF18181B);

  // Neutrals (dark)
  static const neutralD0 = Color(0xFF0A0B0F);
  static const neutralD50 = Color(0xFF101218);
  static const neutralD100 = Color(0xFF181B23);
  static const neutralD200 = Color(0xFF23262F);
  static const neutralD300 = Color(0xFF2E323D);
  static const neutralD400 = Color(0xFF52576B);
  static const neutralD500 = Color(0xFF7B8194);
  static const neutralD800 = Color(0xFFE4E7EF);
  static const neutralD900 = Color(0xFFF4F5F9);

  // Semantic
  static const success = Color(0xFF16A34A);
  static const successDark = Color(0xFF22C55E);
  static const warning = Color(0xFFCA8A04);
  static const warningDark = Color(0xFFEAB308);
  static const danger = Color(0xFFDC2626);
  static const dangerDark = Color(0xFFEF4444);
  static const info = Color(0xFF2563EB);
  static const infoDark = Color(0xFF60A5FA);
}

abstract final class AppTheme {
  static TextTheme _buildTextTheme(Color textColor) {
    return GoogleFonts.interTextTheme().copyWith(
      displayLarge: GoogleFonts.interTight(
        fontSize: 36,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.02 * 36,
        color: textColor,
      ),
      displayMedium: GoogleFonts.interTight(
        fontSize: 30,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.01 * 30,
        color: textColor,
      ),
      headlineLarge: GoogleFonts.interTight(
        fontSize: 24,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.01 * 24,
        color: textColor,
      ),
      headlineMedium: GoogleFonts.interTight(
        fontSize: 20,
        fontWeight: FontWeight.w600,
        color: textColor,
      ),
      titleLarge: GoogleFonts.inter(
        fontSize: 18,
        fontWeight: FontWeight.w500,
        color: textColor,
      ),
      titleMedium: GoogleFonts.inter(
        fontSize: 16,
        fontWeight: FontWeight.w500,
        color: textColor,
      ),
      bodyLarge: GoogleFonts.inter(
        fontSize: 16,
        fontWeight: FontWeight.w400,
        height: 1.5,
        color: textColor,
      ),
      bodyMedium: GoogleFonts.inter(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        height: 1.5,
        color: textColor,
      ),
      bodySmall: GoogleFonts.inter(
        fontSize: 12,
        fontWeight: FontWeight.w400,
        color: textColor,
      ),
      labelLarge: GoogleFonts.inter(
        fontSize: 16,
        fontWeight: FontWeight.w500,
        color: textColor,
      ),
    );
  }

  static ThemeData light() {
    const cs = ColorScheme(
      brightness: Brightness.light,
      primary: AppColors.brandPrimary,
      onPrimary: AppColors.neutral0,
      primaryContainer: Color(0xFFDDE8FF),
      onPrimaryContainer: AppColors.brandPrimary,
      secondary: AppColors.brandAccent,
      onSecondary: AppColors.neutral0,
      secondaryContainer: Color(0xFFFFEDD5),
      onSecondaryContainer: AppColors.brandAccent,
      error: AppColors.danger,
      onError: AppColors.neutral0,
      surface: AppColors.neutral0,
      onSurface: AppColors.neutral900,
      surfaceContainerHighest: AppColors.neutral100,
      onSurfaceVariant: AppColors.neutral500,
      outline: AppColors.neutral300,
      outlineVariant: AppColors.neutral200,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: cs,
      textTheme: _buildTextTheme(AppColors.neutral900),
      scaffoldBackgroundColor: AppColors.neutral0,
      // Passenger gets slightly warmer surface (1% warm gray per spec)
      cardTheme: CardThemeData(
        color: const Color(0xFFF5F4F3), // subtle warm tint
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: AppColors.neutral200),
        ),
        margin: EdgeInsets.zero,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.neutral50,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.neutral300),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.neutral300),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide:
              const BorderSide(color: AppColors.brandPrimary, width: 1.5),
        ),
        hintStyle: GoogleFonts.inter(
          color: AppColors.neutral400,
          fontSize: 16,
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.brandPrimary,
          foregroundColor: AppColors.neutral0,
          textStyle: GoogleFonts.inter(
            fontSize: 16,
            fontWeight: FontWeight.w500,
          ),
          minimumSize: const Size(0, 48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.brandAccent,
          foregroundColor: AppColors.neutral900,
          textStyle: GoogleFonts.inter(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
          minimumSize: const Size(0, 52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
    );
  }

  static ThemeData dark() {
    const cs = ColorScheme(
      brightness: Brightness.dark,
      primary: AppColors.brandPrimaryDark,
      onPrimary: AppColors.neutralD0,
      primaryContainer: Color(0xFF1E2F52),
      onPrimaryContainer: AppColors.brandPrimaryDark,
      secondary: AppColors.brandAccentDark,
      onSecondary: AppColors.neutralD0,
      secondaryContainer: Color(0xFF3D2A0A),
      onSecondaryContainer: AppColors.brandAccentDark,
      error: AppColors.dangerDark,
      onError: AppColors.neutralD0,
      surface: AppColors.neutralD0,
      onSurface: AppColors.neutralD900,
      surfaceContainerHighest: AppColors.neutralD100,
      onSurfaceVariant: AppColors.neutralD500,
      outline: AppColors.neutralD300,
      outlineVariant: AppColors.neutralD200,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: cs,
      textTheme: _buildTextTheme(AppColors.neutralD900),
      scaffoldBackgroundColor: AppColors.neutralD0,
      cardTheme: CardThemeData(
        color: AppColors.neutralD100,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: AppColors.neutralD200),
        ),
        margin: EdgeInsets.zero,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.neutralD50,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.neutralD300),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.neutralD300),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide:
              const BorderSide(color: AppColors.brandPrimaryDark, width: 1.5),
        ),
        hintStyle: GoogleFonts.inter(
          color: AppColors.neutralD400,
          fontSize: 16,
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.brandPrimaryDark,
          foregroundColor: AppColors.neutralD0,
          minimumSize: const Size(0, 48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
    );
  }
}
