import 'package:flutter/material.dart';
import 'package:remis_design_system/remis_design_system.dart';

class RPremiumActionButton extends StatefulWidget {
  const RPremiumActionButton({
    super.key,
    required this.label,
    this.onPressed,
    this.isLoading = false,
    this.holdToConfirm = false,
    this.holdDuration = const Duration(milliseconds: 800),
    this.backgroundColor,
    this.foregroundColor,
    this.icon,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final bool holdToConfirm;
  final Duration holdDuration;
  final Color? backgroundColor;
  final Color? foregroundColor;
  final IconData? icon;

  @override
  State<RPremiumActionButton> createState() => _RPremiumActionButtonState();
}

class _RPremiumActionButtonState extends State<RPremiumActionButton>
    with TickerProviderStateMixin {
  late final AnimationController _scaleController;
  late final AnimationController _holdController;
  late final Animation<double> _scaleAnimation;

  bool _isPressed = false;

  @override
  void initState() {
    super.initState();

    _scaleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 100),
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.98).animate(
      CurvedAnimation(parent: _scaleController, curve: Curves.easeInOut),
    );

    _holdController = AnimationController(
      vsync: this,
      duration: widget.holdDuration,
    );
    _holdController.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        _holdController.reset();
        widget.onPressed?.call();
      }
    });
  }

  @override
  void dispose() {
    _scaleController.dispose();
    _holdController.dispose();
    super.dispose();
  }

  bool get _isDisabled => widget.isLoading || widget.onPressed == null;

  void _onTapDown(TapDownDetails _) {
    if (_isDisabled || widget.holdToConfirm) return;
    setState(() => _isPressed = true);
    _scaleController.forward();
  }

  void _onTapUp(TapUpDetails _) {
    if (_isDisabled || widget.holdToConfirm) return;
    setState(() => _isPressed = false);
    _scaleController.reverse();
  }

  void _onTapCancel() {
    if (widget.holdToConfirm) return;
    setState(() => _isPressed = false);
    _scaleController.reverse();
  }

  void _onTap() {
    if (_isDisabled || widget.holdToConfirm) return;
    widget.onPressed?.call();
  }

  void _onLongPressStart(LongPressStartDetails _) {
    if (_isDisabled || !widget.holdToConfirm) return;
    _scaleController.forward();
    _holdController.forward();
  }

  void _onLongPressEnd(LongPressEndDetails _) {
    if (!widget.holdToConfirm) return;
    _scaleController.reverse();
    if (_holdController.status != AnimationStatus.completed) {
      _holdController.reverse();
    }
  }

  void _onLongPressCancel() {
    if (!widget.holdToConfirm) return;
    _scaleController.reverse();
    _holdController.reverse();
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final bgColor =
        widget.backgroundColor ?? kBrandPrimary;
    final fgColor = widget.foregroundColor ?? Colors.white;
    final effectiveBg =
        _isDisabled ? bgColor.withValues(alpha: 0.5) : bgColor;

    return Semantics(
      label: widget.label,
      button: true,
      enabled: !_isDisabled,
      child: GestureDetector(
        onTapDown: _onTapDown,
        onTapUp: _onTapUp,
        onTapCancel: _onTapCancel,
        onTap: _onTap,
        onLongPressStart: _onLongPressStart,
        onLongPressEnd: _onLongPressEnd,
        onLongPressCancel: _onLongPressCancel,
        child: Padding(
          padding: const EdgeInsets.all(RSpacing.s8),
          child: AnimatedBuilder(
            animation: _scaleAnimation,
            builder: (context, child) => Transform.scale(
              scale: _scaleAnimation.value,
              child: child,
            ),
            child: AnimatedBuilder(
              animation: _holdController,
              builder: (context, child) {
                return SizedBox(
                  height: 72,
                  child: Stack(
                    children: [
                      Container(
                        height: 72,
                        decoration: BoxDecoration(
                          color: effectiveBg,
                          borderRadius: BorderRadius.circular(RRadius.md),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: RSpacing.s32,
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              if (widget.icon != null) ...[
                                Icon(widget.icon,
                                    color: fgColor, size: RTextSize.lg),
                                const SizedBox(width: RSpacing.s8),
                              ],
                              Text(
                                widget.label,
                                style: inter(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w600,
                                  color: fgColor,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      if (widget.isLoading)
                        Positioned(
                          left: 0,
                          right: 0,
                          bottom: 0,
                          child: ClipRRect(
                            borderRadius: const BorderRadius.only(
                              bottomLeft: Radius.circular(RRadius.md),
                              bottomRight: Radius.circular(RRadius.md),
                            ),
                            child: SizedBox(
                              height: 3,
                              child: LinearProgressIndicator(
                                backgroundColor:
                                    fgColor.withValues(alpha: 0.3),
                                valueColor:
                                    AlwaysStoppedAnimation<Color>(fgColor),
                              ),
                            ),
                          ),
                        ),
                      if (widget.holdToConfirm && _holdController.value > 0)
                        Positioned(
                          left: 0,
                          top: 0,
                          bottom: 0,
                          child: FractionallySizedBox(
                            widthFactor: _holdController.value,
                            child: Container(
                              decoration: BoxDecoration(
                                color: fgColor.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.horizontal(
                                  left: const Radius.circular(RRadius.md),
                                  right: _holdController.value >= 1.0
                                      ? const Radius.circular(RRadius.md)
                                      : Radius.zero,
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}
