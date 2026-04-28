import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../tokens/colors.dart';
import '../tokens/spacing.dart';
import '../tokens/typography.dart';

ThemeData buildLightTheme() {
  final base = ThemeData.light(useMaterial3: true);
  return base.copyWith(
    colorScheme: ColorScheme.fromSeed(
      seedColor: kBrandPrimary,
      brightness: Brightness.light,
      primary: kBrandPrimary,
      secondary: kBrandAccent,
      surface: kNeutral0Light,
      error: kDanger,
    ),
    scaffoldBackgroundColor: kNeutral0Light,
    appBarTheme: AppBarTheme(
      backgroundColor: kNeutral0Light,
      foregroundColor: kNeutral900Light,
      elevation: 0,
      scrolledUnderElevation: 1,
      systemOverlayStyle: SystemUiOverlayStyle.dark,
      titleTextStyle: interTight(
        fontSize: RTextSize.md,
        fontWeight: FontWeight.w600,
        color: kNeutral900Light,
      ),
    ),
    cardTheme: CardThemeData(
      color: kNeutral100Light,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(RRadius.lg),
        side: const BorderSide(color: kNeutral200Light),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: kNeutral50Light,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(RRadius.md),
        borderSide: const BorderSide(color: kNeutral300Light),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(RRadius.md),
        borderSide: const BorderSide(color: kNeutral300Light),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(RRadius.md),
        borderSide: const BorderSide(color: kBrandPrimary, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(RRadius.md),
        borderSide: const BorderSide(color: kDanger),
      ),
      hintStyle: inter(fontSize: RTextSize.base, color: kNeutral400Light),
      labelStyle: inter(fontSize: RTextSize.sm, color: kNeutral600Light),
      contentPadding: const EdgeInsets.symmetric(
        horizontal: RSpacing.s16,
        vertical: RSpacing.s12,
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: kBrandPrimary,
        foregroundColor: Colors.white,
        minimumSize: const Size(double.infinity, 48),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(RRadius.md),
        ),
        textStyle: inter(
          fontSize: RTextSize.base,
          fontWeight: FontWeight.w500,
        ),
        elevation: 0,
      ),
    ),
    textTheme: GoogleFonts.interTextTheme(base.textTheme).copyWith(
      displayLarge: interTight(
        fontSize: RTextSize.xl3,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.02 * RTextSize.xl3,
        height: 1.05,
      ),
      headlineMedium: interTight(
        fontSize: RTextSize.xl2,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.01 * RTextSize.xl2,
        height: 1.2,
      ),
      titleLarge: interTight(
        fontSize: RTextSize.xl,
        fontWeight: FontWeight.w600,
        height: 1.2,
      ),
      bodyLarge: inter(fontSize: RTextSize.base, height: 1.5),
      bodyMedium: inter(fontSize: RTextSize.sm, height: 1.5),
      bodySmall: inter(fontSize: RTextSize.xs, height: 1.5),
    ),
  );
}

ThemeData buildDarkTheme() {
  final base = ThemeData.dark(useMaterial3: true);
  return base.copyWith(
    colorScheme: ColorScheme.fromSeed(
      seedColor: kBrandPrimaryDark,
      brightness: Brightness.dark,
      primary: kBrandPrimaryDark,
      secondary: kBrandAccentDark,
      surface: kNeutral0Dark,
      error: kDangerDark,
    ),
    scaffoldBackgroundColor: kNeutral0Dark,
    appBarTheme: AppBarTheme(
      backgroundColor: kNeutral0Dark,
      foregroundColor: kNeutral900Dark,
      elevation: 0,
      scrolledUnderElevation: 1,
      systemOverlayStyle: SystemUiOverlayStyle.light,
      titleTextStyle: interTight(
        fontSize: RTextSize.md,
        fontWeight: FontWeight.w600,
        color: kNeutral900Dark,
      ),
    ),
    cardTheme: CardThemeData(
      color: kNeutral100Dark,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(RRadius.lg),
        side: const BorderSide(color: kNeutral200Dark),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: kNeutral50Dark,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(RRadius.md),
        borderSide: const BorderSide(color: kNeutral300Dark),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(RRadius.md),
        borderSide: const BorderSide(color: kNeutral300Dark),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(RRadius.md),
        borderSide: const BorderSide(color: kBrandPrimaryDark, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(RRadius.md),
        borderSide: const BorderSide(color: kDangerDark),
      ),
      hintStyle: inter(fontSize: RTextSize.base, color: kNeutral400Dark),
      labelStyle: inter(fontSize: RTextSize.sm, color: kNeutral600Dark),
      contentPadding: const EdgeInsets.symmetric(
        horizontal: RSpacing.s16,
        vertical: RSpacing.s12,
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: kBrandPrimaryDark,
        foregroundColor: kNeutral0Dark,
        minimumSize: const Size(double.infinity, 48),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(RRadius.md),
        ),
        textStyle: inter(
          fontSize: RTextSize.base,
          fontWeight: FontWeight.w500,
        ),
        elevation: 0,
      ),
    ),
    textTheme: GoogleFonts.interTextTheme(base.textTheme).copyWith(
      displayLarge: interTight(
        fontSize: RTextSize.xl3,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.02 * RTextSize.xl3,
        height: 1.05,
        color: kNeutral900Dark,
      ),
      headlineMedium: interTight(
        fontSize: RTextSize.xl2,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.01 * RTextSize.xl2,
        height: 1.2,
        color: kNeutral900Dark,
      ),
      titleLarge: interTight(
        fontSize: RTextSize.xl,
        fontWeight: FontWeight.w600,
        height: 1.2,
        color: kNeutral900Dark,
      ),
      bodyLarge: inter(fontSize: RTextSize.base, height: 1.5, color: kNeutral800Dark),
      bodyMedium: inter(fontSize: RTextSize.sm, height: 1.5, color: kNeutral800Dark),
      bodySmall: inter(fontSize: RTextSize.xs, height: 1.5, color: kNeutral700Dark),
    ),
  );
}
