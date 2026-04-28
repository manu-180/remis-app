import 'dart:math' as math;

import 'package:flutter/material.dart';

/// Loading placeholder para pantallas con mapa fullscreen.
///
/// Muestra un fondo con colores reales de mapa (verdes) + calles decorativas
/// + pin naranja pulsante en el centro + skeleton de bottom sheet.
/// Se desvanece suavemente cuando [visible] cambia a false.
class MapLoadingPlaceholder extends StatefulWidget {
  const MapLoadingPlaceholder({
    super.key,
    this.visible = true,
    /// Color del pin (naranja por defecto — mismo que los markers de la app)
    this.pinColor = const Color(0xFFF97316),
    /// Altura del skeleton de bottom sheet
    this.bottomSheetHeight = 90.0,
  });

  final bool visible;
  final Color pinColor;
  final double bottomSheetHeight;

  @override
  State<MapLoadingPlaceholder> createState() => _MapLoadingPlaceholderState();
}

class _MapLoadingPlaceholderState extends State<MapLoadingPlaceholder>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulseCtrl;
  late final Animation<double> _pulseAnim;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);

    _pulseAnim = CurvedAnimation(
      parent: _pulseCtrl,
      curve: Curves.easeInOut,
    );
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedOpacity(
      opacity: widget.visible ? 1.0 : 0.0,
      duration: const Duration(milliseconds: 400),
      curve: Curves.easeOut,
      // Ignorar toques cuando está invisible para no bloquear el mapa
      child: IgnorePointer(
        ignoring: !widget.visible,
        child: Stack(
          fit: StackFit.expand,
          children: [
            // ── Fondo: colores reales de mapa ──────────────────────────────
            _MapBackground(),

            // ── Calles decorativas ─────────────────────────────────────────
            ..._buildRoads(context),

            // ── Pin pulsante en el centro ──────────────────────────────────
            Center(
              child: _PulsingPin(
                animation: _pulseAnim,
                color: widget.pinColor,
              ),
            ),

            // ── Skeleton de top bar ────────────────────────────────────────
            Positioned(
              top: MediaQuery.of(context).padding.top + 8,
              left: 12,
              right: 12,
              child: _TopBarSkeleton(),
            ),

            // ── Skeleton de bottom sheet ───────────────────────────────────
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: _BottomSheetSkeleton(
                height: widget.bottomSheetHeight,
                context: context,
              ),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildRoads(BuildContext context) {
    final size = MediaQuery.of(context).size;
    return [
      // Calle horizontal principal
      Positioned(
        top: size.height * 0.42,
        left: 0,
        right: 0,
        child: Transform.rotate(
          angle: -0.05,
          child: Container(height: 3, color: Colors.white.withValues(alpha: 0.35)),
        ),
      ),
      // Calle horizontal secundaria
      Positioned(
        top: size.height * 0.28,
        left: 0,
        right: 0,
        child: Transform.rotate(
          angle: 0.07,
          child: Container(height: 2, color: Colors.white.withValues(alpha: 0.22)),
        ),
      ),
      // Calle vertical
      Positioned(
        top: 0,
        bottom: 0,
        left: size.width * 0.3,
        child: Transform.rotate(
          angle: 0.03,
          child: Container(width: 3, color: Colors.white.withValues(alpha: 0.28)),
        ),
      ),
      // Calle vertical derecha
      Positioned(
        top: 0,
        bottom: 0,
        left: size.width * 0.72,
        child: Transform.rotate(
          angle: -0.04,
          child: Container(width: 2, color: Colors.white.withValues(alpha: 0.18)),
        ),
      ),
      // Manzana simulada (rectángulo suave)
      Positioned(
        top: size.height * 0.18,
        left: size.width * 0.1,
        child: Container(
          width: size.width * 0.25,
          height: size.height * 0.08,
          decoration: BoxDecoration(
            color: const Color(0xFFBBD4B8).withValues(alpha: 0.6),
            borderRadius: BorderRadius.circular(4),
          ),
        ),
      ),
      Positioned(
        top: size.height * 0.52,
        left: size.width * 0.55,
        child: Container(
          width: size.width * 0.3,
          height: size.height * 0.07,
          decoration: BoxDecoration(
            color: const Color(0xFFBBD4B8).withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(4),
          ),
        ),
      ),
    ];
  }
}

// ── Fondo degradado mapa ─────────────────────────────────────────────────────

class _MapBackground extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Color(0xFFD4E8CC),
            Color(0xFFC4DEC0),
            Color(0xFFB8D6B4),
            Color(0xFFAACAA6),
          ],
        ),
      ),
    );
  }
}

// ── Pin pulsante ──────────────────────────────────────────────────────────────

class _PulsingPin extends StatelessWidget {
  const _PulsingPin({
    required this.animation,
    required this.color,
  });

  final Animation<double> animation;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: animation,
      builder: (_, __) {
        final pulse = animation.value;
        final shadowRadius = 6.0 + pulse * 14.0;
        final shadowOpacity = 0.25 - pulse * 0.18;

        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Círculo con halo pulsante
            Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: color.withValues(alpha: shadowOpacity.clamp(0.05, 0.3)),
                    blurRadius: shadowRadius,
                    spreadRadius: shadowRadius * 0.4,
                  ),
                ],
              ),
            ),
            // Palito del pin
            Container(
              width: 2.5,
              height: 14,
              decoration: BoxDecoration(
                color: color,
                borderRadius: const BorderRadius.only(
                  bottomLeft: Radius.circular(2),
                  bottomRight: Radius.circular(2),
                ),
              ),
            ),
            // Sombra del pin en el suelo
            Container(
              width: 10,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          ],
        );
      },
    );
  }
}

// ── Skeleton top bar ──────────────────────────────────────────────────────────

class _TopBarSkeleton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 48,
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.symmetric(horizontal: 14),
      child: Row(
        children: [
          // Avatar skeleton
          Container(
            width: 30,
            height: 30,
            decoration: const BoxDecoration(
              color: Color(0xFFE0E0E0),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 12),
          // Text skeleton
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  height: 9,
                  width: 90,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE4E4E7),
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                const SizedBox(height: 5),
                Container(
                  height: 7,
                  width: 55,
                  decoration: BoxDecoration(
                    color: const Color(0xFFEEEEEE),
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ],
            ),
          ),
          // Icon skeleton
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: const Color(0xFFE8E8E8),
              borderRadius: BorderRadius.circular(6),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Skeleton bottom sheet ─────────────────────────────────────────────────────

class _BottomSheetSkeleton extends StatelessWidget {
  const _BottomSheetSkeleton({
    required this.height,
    required this.context,
  });

  final double height;
  final BuildContext context;

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.of(context).padding.bottom;
    return Container(
      height: height + bottomPadding,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        boxShadow: [
          BoxShadow(
            color: Color(0x18000000),
            blurRadius: 16,
            offset: Offset(0, -4),
          ),
        ],
      ),
      padding: EdgeInsets.fromLTRB(20, 14, 20, 16 + bottomPadding),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: const Color(0xFFE0E0E0),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 16),
          // Skeleton line 1
          Container(
            height: 12,
            width: double.infinity,
            decoration: BoxDecoration(
              color: const Color(0xFFEEEEEE),
              borderRadius: BorderRadius.circular(6),
            ),
          ),
          const SizedBox(height: 8),
          // Skeleton line 2 (más corta)
          Align(
            alignment: Alignment.centerLeft,
            child: Container(
              height: 10,
              width: 160,
              decoration: BoxDecoration(
                color: const Color(0xFFF3F3F3),
                borderRadius: BorderRadius.circular(6),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
