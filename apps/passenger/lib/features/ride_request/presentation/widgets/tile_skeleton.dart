import 'package:flutter/material.dart';

/// Skeleton placeholder that mimics the silhouette of a [ListTile] used in the
/// destination search results. Renders a circular leading shape and two text
/// lines with a subtle horizontal shimmer animation.
class TileSkeleton extends StatefulWidget {
  const TileSkeleton({super.key, this.subtitleWidthFactor = 0.55});

  /// Width of the subtitle line as a fraction of available width. Varies a bit
  /// per row to feel organic.
  final double subtitleWidthFactor;

  @override
  State<TileSkeleton> createState() => _TileSkeletonState();
}

class _TileSkeletonState extends State<TileSkeleton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1200),
  )..repeat();

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final base = isDark ? Colors.white12 : Colors.black12;
    final highlight = isDark ? Colors.white24 : Colors.black.withValues(alpha: 0.06);

    return AnimatedBuilder(
      animation: _ctrl,
      builder: (context, _) {
        return ShaderMask(
          blendMode: BlendMode.srcATop,
          shaderCallback: (bounds) {
            final t = _ctrl.value;
            return LinearGradient(
              begin: Alignment(-1.0 + 2 * t, 0),
              end: Alignment(1.0 + 2 * t, 0),
              colors: [base, highlight, base],
              stops: const [0.0, 0.5, 1.0],
            ).createShader(bounds);
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                _Block(width: 28, height: 28, radius: 14, color: base),
                const SizedBox(width: 16),
                Expanded(
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _Block(
                            width: constraints.maxWidth * 0.7,
                            height: 12,
                            radius: 4,
                            color: base,
                          ),
                          const SizedBox(height: 8),
                          _Block(
                            width:
                                constraints.maxWidth * widget.subtitleWidthFactor,
                            height: 10,
                            radius: 4,
                            color: base,
                          ),
                        ],
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _Block extends StatelessWidget {
  const _Block({
    required this.width,
    required this.height,
    required this.radius,
    required this.color,
  });

  final double width;
  final double height;
  final double radius;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(radius),
      ),
    );
  }
}

/// Renders [count] [TileSkeleton]s with a section header above them.
class SectionSkeleton extends StatelessWidget {
  const SectionSkeleton({super.key, this.count = 3});

  final int count;

  @override
  Widget build(BuildContext context) {
    // Slightly varying widths so the rows don't look identical.
    const widths = [0.55, 0.42, 0.62, 0.48, 0.58];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < count; i++)
          TileSkeleton(subtitleWidthFactor: widths[i % widths.length]),
      ],
    );
  }
}
