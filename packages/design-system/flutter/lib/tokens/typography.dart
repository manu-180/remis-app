import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// Text size scale — Major Third (×1.25), base 16px
abstract final class RTextSize {
  static const double xs2 = 10;
  static const double xs = 12;
  static const double sm = 14;
  static const double base = 16;
  static const double md = 18;
  static const double lg = 20;
  static const double xl = 24;
  static const double xl2 = 30;
  static const double xl3 = 36;
  static const double xl4 = 48;
  static const double xl5 = 60;
}

TextStyle interTight({
  double fontSize = RTextSize.base,
  FontWeight fontWeight = FontWeight.w400,
  Color? color,
  double? letterSpacing,
  double? height,
}) =>
    GoogleFonts.interTight(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      letterSpacing: letterSpacing,
      height: height,
    );

TextStyle inter({
  double fontSize = RTextSize.base,
  FontWeight fontWeight = FontWeight.w400,
  Color? color,
  double? letterSpacing,
  double? height,
}) =>
    GoogleFonts.inter(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      letterSpacing: letterSpacing,
      height: height,
    );

TextStyle geistMono({
  double fontSize = RTextSize.base,
  FontWeight fontWeight = FontWeight.w400,
  Color? color,
}) =>
    GoogleFonts.sourceCodePro(
      // Closest available on google_fonts — Tanda 1B replaces with Geist Mono
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      height: 1.4,
    );
