import 'package:flutter/material.dart';

// ─── Brand ───────────────────────────────────────────────────────────────────
const kBrandPrimary = Color(0xFF1B2A4E);
const kBrandPrimaryHover = Color(0xFF243762);
const kBrandPrimaryDark = Color(0xFF7CA0FF);
const kBrandPrimaryHoverDark = Color(0xFF9CB7FF);

const kBrandAccent = Color(0xFFD97706);
const kBrandAccentHover = Color(0xFFB45309);
const kBrandAccentDark = Color(0xFFF59E0B);
const kBrandAccentHoverDark = Color(0xFFFBBF24);

// ─── Neutrals (light / dark) ─────────────────────────────────────────────────
const kNeutral0Light = Color(0xFFFFFFFF);
const kNeutral0Dark = Color(0xFF0A0B0F);

const kNeutral50Light = Color(0xFFFAFAFA);
const kNeutral50Dark = Color(0xFF101218);

const kNeutral100Light = Color(0xFFF4F4F5);
const kNeutral100Dark = Color(0xFF181B23);

const kNeutral200Light = Color(0xFFE4E4E7);
const kNeutral200Dark = Color(0xFF23262F);

const kNeutral300Light = Color(0xFFD4D4D8);
const kNeutral300Dark = Color(0xFF2E323D);

const kNeutral400Light = Color(0xFFA1A1AA);
const kNeutral400Dark = Color(0xFF52576B);

const kNeutral500Light = Color(0xFF71717A);
const kNeutral500Dark = Color(0xFF7B8194);

const kNeutral600Light = Color(0xFF52525B);
const kNeutral600Dark = Color(0xFFA4AABB);

const kNeutral700Light = Color(0xFF3F3F46);
const kNeutral700Dark = Color(0xFFC7CCDB);

const kNeutral800Light = Color(0xFF27272A);
const kNeutral800Dark = Color(0xFFE4E7EF);

const kNeutral900Light = Color(0xFF18181B);
const kNeutral900Dark = Color(0xFFF4F5F9);

// ─── Semantic ─────────────────────────────────────────────────────────────────
const kSuccess = Color(0xFF16A34A);
const kSuccessDark = Color(0xFF22C55E);
const kSuccessBg = Color(0xFFF0FDF4);
const kSuccessBgDark = Color(0xFF0E2417);

const kWarning = Color(0xFFCA8A04);
const kWarningDark = Color(0xFFEAB308);
const kWarningBg = Color(0xFFFEFCE8);
const kWarningBgDark = Color(0xFF1F1B0E);

const kDanger = Color(0xFFDC2626);
const kDangerDark = Color(0xFFEF4444);
const kDangerBg = Color(0xFFFEF2F2);
const kDangerBgDark = Color(0xFF27110F);

const kInfo = Color(0xFF2563EB);
const kInfoDark = Color(0xFF60A5FA);
const kInfoBg = Color(0xFFEFF6FF);
const kInfoBgDark = Color(0xFF0E1B2D);

// ─── Driver status colors ─────────────────────────────────────────────────────
const kDriverAvailable = kSuccess;
const kDriverEnRoute = kInfo;
const kDriverWaiting = kWarning;
const kDriverOnTrip = kDanger;
const kDriverOnBreak = Color(0xFFFACC15);
const kDriverOffline = kNeutral500Light;
const kDriverSuspended = Color(0xFFA855F7);
