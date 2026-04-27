import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:remis_design_system/remis_design_system.dart';

enum RToastType { info, success, error, action }

class RToastData {
  RToastData({
    required this.message,
    required this.type,
    this.actionLabel,
    this.onAction,
    String? id,
  }) : id = id ?? DateTime.now().microsecondsSinceEpoch.toString();

  final String id;
  final String message;
  final RToastType type;
  final String? actionLabel;
  final VoidCallback? onAction;
}

class _ToastEntry {
  _ToastEntry({required this.data, required this.entry});
  final RToastData data;
  final OverlayEntry entry;
}

final Map<String, _ToastEntry> _activeEntries = {};

void showToast(BuildContext context, RToastData data) {
  final overlay = Overlay.of(context, rootOverlay: true);

  late OverlayEntry entry;

  void dismiss() {
    final e = _activeEntries.remove(data.id);
    if (e != null) {
      try {
        e.entry.remove();
      } catch (_) {}
    }
  }

  entry = OverlayEntry(
    builder: (_) => _ToastPositioned(
      data: data,
      entryIndex: _activeEntries.length,
      onDismiss: dismiss,
    ),
  );

  if (_activeEntries.length >= 3) {
    final oldest = _activeEntries.values.first;
    _activeEntries.remove(oldest.data.id);
    try {
      oldest.entry.remove();
    } catch (_) {}
  }

  _activeEntries[data.id] = _ToastEntry(data: data, entry: entry);
  overlay.insert(entry);
}

class _ToastPositioned extends StatelessWidget {
  const _ToastPositioned({
    required this.data,
    required this.entryIndex,
    required this.onDismiss,
  });

  final RToastData data;
  final int entryIndex;
  final VoidCallback onDismiss;

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: RSpacing.s16,
      right: RSpacing.s16,
      bottom: RSpacing.s32 + (entryIndex * 80.0),
      child: Material(
        color: Colors.transparent,
        child: RToast(data: data, onDismiss: onDismiss),
      ),
    );
  }
}

class RToast extends StatefulWidget {
  const RToast({super.key, required this.data, required this.onDismiss});

  final RToastData data;
  final VoidCallback onDismiss;

  @override
  State<RToast> createState() => _RToastState();
}

class _RToastState extends State<RToast> {
  @override
  void initState() {
    super.initState();
    final duration = switch (widget.data.type) {
      RToastType.info => const Duration(seconds: 4),
      RToastType.success => const Duration(seconds: 4),
      RToastType.error => const Duration(seconds: 8),
      RToastType.action => const Duration(seconds: 30),
    };
    Future.delayed(duration, () {
      if (mounted) widget.onDismiss();
    });
  }

  Color _bgColor(BuildContext context) => switch (widget.data.type) {
        RToastType.success => kSuccess,
        RToastType.error => kDanger,
        RToastType.info => kNeutral900Light,
        RToastType.action => kBrandPrimary,
      };

  IconData _icon() => switch (widget.data.type) {
        RToastType.success => Icons.check_circle_rounded,
        RToastType.error => Icons.error_rounded,
        RToastType.info => Icons.info_rounded,
        RToastType.action => Icons.bolt_rounded,
      };

  @override
  Widget build(BuildContext context) {
    final bg = _bgColor(context);
    const fg = Colors.white;

    return GestureDetector(
      onTap: widget.onDismiss,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: RSpacing.s16,
          vertical: RSpacing.s12,
        ),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(RRadius.lg),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.18),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Icon(_icon(), color: fg, size: RTextSize.md),
            const SizedBox(width: RSpacing.s12),
            Expanded(
              child: Text(
                widget.data.message,
                style: inter(
                  fontSize: RTextSize.sm,
                  fontWeight: FontWeight.w500,
                  color: fg,
                ),
              ),
            ),
            if (widget.data.actionLabel != null &&
                widget.data.onAction != null) ...[
              const SizedBox(width: RSpacing.s8),
              TextButton(
                onPressed: () {
                  widget.data.onAction?.call();
                  widget.onDismiss();
                },
                style: TextButton.styleFrom(
                  foregroundColor: fg,
                  padding: const EdgeInsets.symmetric(
                    horizontal: RSpacing.s8,
                    vertical: RSpacing.s4,
                  ),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: Text(
                  widget.data.actionLabel!,
                  style: inter(
                    fontSize: RTextSize.sm,
                    fontWeight: FontWeight.w700,
                    color: fg,
                  ),
                ),
              ),
            ],
          ],
        ),
      )
          .animate()
          .slideY(
            begin: 0.4,
            end: 0,
            duration: 240.ms,
            curve: Curves.easeOut,
          )
          .fadeIn(
            duration: 240.ms,
            curve: Curves.easeOut,
          ),
    );
  }
}
