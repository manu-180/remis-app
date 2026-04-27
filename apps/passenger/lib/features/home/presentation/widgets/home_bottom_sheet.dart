import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../../../core/theme/app_theme.dart';

enum _SheetStop { collapsed, half, full }

class HomeBottomSheet extends StatefulWidget {
  const HomeBottomSheet({
    super.key,
    required this.pickupLocation,
    required this.onDestinationSelected,
    this.onSearchTap,
  });

  final LatLng? pickupLocation;
  final ValueChanged<String> onDestinationSelected;

  /// When provided, tapping the "¿A dónde vamos?" bar in collapsed state
  /// calls this callback instead of expanding the sheet.
  final VoidCallback? onSearchTap;

  @override
  State<HomeBottomSheet> createState() => _HomeBottomSheetState();
}

class _HomeBottomSheetState extends State<HomeBottomSheet>
    with SingleTickerProviderStateMixin {
  _SheetStop _stop = _SheetStop.collapsed;
  late final AnimationController _animCtrl;
  late Animation<double> _heightAnim;
  final _destinationCtrl = TextEditingController();
  bool _scheduleMode = false;

  static const _collapsed = 160.0;
  static const _half = 360.0;
  static const _full = 720.0;

  @override
  void initState() {
    super.initState();
    _animCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 360),
    );
    _heightAnim = Tween<double>(begin: _collapsed, end: _collapsed).animate(
      CurvedAnimation(parent: _animCtrl, curve: Curves.easeOutBack),
    );
  }

  @override
  void dispose() {
    _animCtrl.dispose();
    _destinationCtrl.dispose();
    super.dispose();
  }

  void _animateTo(_SheetStop stop) {
    final target = switch (stop) {
      _SheetStop.collapsed => _collapsed,
      _SheetStop.half => _half,
      _SheetStop.full => _full,
    };
    _heightAnim = Tween<double>(
      begin: _heightAnim.value,
      end: target,
    ).animate(CurvedAnimation(parent: _animCtrl, curve: Curves.easeOutBack));
    setState(() => _stop = stop);
    _animCtrl
      ..reset()
      ..forward();
  }

  bool get _hasDestination => _destinationCtrl.text.trim().isNotEmpty;

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: 0,
      right: 0,
      bottom: 0,
      child: AnimatedBuilder(
        animation: _heightAnim,
        builder: (context, child) => SizedBox(
          height: _heightAnim.value,
          child: child,
        ),
        child: _SheetContent(
          stop: _stop,
          destinationCtrl: _destinationCtrl,
          scheduleMode: _scheduleMode,
          hasDestination: _hasDestination,
          onExpand: () => _animateTo(_SheetStop.half),
          onFullExpand: () => _animateTo(_SheetStop.full),
          onCollapse: () => _animateTo(_SheetStop.collapsed),
          onScheduleToggle: () =>
              setState(() => _scheduleMode = !_scheduleMode),
          onRequestRide: () {
            widget.onDestinationSelected(_destinationCtrl.text.trim());
          },
          onDestinationChanged: (_) => setState(() {}),
          onSearchTap: widget.onSearchTap,
        ),
      ),
    );
  }
}

class _SheetContent extends StatelessWidget {
  const _SheetContent({
    required this.stop,
    required this.destinationCtrl,
    required this.scheduleMode,
    required this.hasDestination,
    required this.onExpand,
    required this.onFullExpand,
    required this.onCollapse,
    required this.onScheduleToggle,
    required this.onRequestRide,
    required this.onDestinationChanged,
    this.onSearchTap,
  });

  final _SheetStop stop;
  final TextEditingController destinationCtrl;
  final bool scheduleMode;
  final bool hasDestination;
  final VoidCallback onExpand;
  final VoidCallback onFullExpand;
  final VoidCallback onCollapse;
  final VoidCallback onScheduleToggle;
  final VoidCallback onRequestRide;
  final ValueChanged<String> onDestinationChanged;
  final VoidCallback? onSearchTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        // Glass effect only on this card over map (spec)
        color: isDark
            ? const Color(0xB8101218) // rgba(16,18,24,0.72)
            : const Color(0xB8FFFFFF), // rgba(255,255,255,0.72)
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        border: Border(
          top: BorderSide(
            color: isDark
                ? const Color(0x0FFFFFFF)
                : const Color(0x80FFFFFF),
          ),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.12),
            blurRadius: 24,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          GestureDetector(
            onVerticalDragEnd: (d) {
              if (d.primaryVelocity != null) {
                if (d.primaryVelocity! < -100) {
                  if (stop == _SheetStop.collapsed) onExpand();
                  if (stop == _SheetStop.half) onFullExpand();
                } else if (d.primaryVelocity! > 100) {
                  if (stop == _SheetStop.full) onExpand();
                  if (stop == _SheetStop.half) onCollapse();
                }
              }
            },
            child: Container(
              width: double.infinity,
              alignment: Alignment.center,
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Container(
                width: 44,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark
                      ? AppColors.neutralD300
                      : AppColors.neutral300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
          ),

          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
              physics: stop == _SheetStop.collapsed
                  ? const NeverScrollableScrollPhysics()
                  : null,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // ── Stop collapsed: "¿A dónde vamos?" + chips frecuentes ──
                  GestureDetector(
                    onTap: stop == _SheetStop.collapsed
                        ? (onSearchTap ?? onExpand)
                        : null,
                    child: Container(
                      height: 52,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(
                        color: isDark
                            ? AppColors.neutralD200
                            : AppColors.neutral100,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isDark
                              ? AppColors.neutralD300
                              : AppColors.neutral200,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.search,
                            color: isDark
                                ? AppColors.neutralD400
                                : AppColors.neutral400,
                          ),
                          const SizedBox(width: 12),
                          Text(
                            '¿A dónde vamos?',
                            style: theme.textTheme.bodyLarge?.copyWith(
                              color: isDark
                                  ? AppColors.neutralD400
                                  : AppColors.neutral400,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // ── Frecuentes ──
                  Wrap(
                    spacing: 8,
                    children: [
                      _FrequentChip(label: 'Casa', icon: Icons.home_outlined),
                      _FrequentChip(
                          label: 'Trabajo', icon: Icons.work_outline),
                    ],
                  ),

                  // ── Half / Full: inputs origen + destino ──
                  if (stop != _SheetStop.collapsed) ...[
                    const SizedBox(height: 20),
                    _LocationInput(
                      icon: Icons.radio_button_checked,
                      iconColor: AppColors.brandPrimary,
                      hint: 'Mi ubicación',
                      readOnly: true,
                    ),
                    const SizedBox(height: 8),
                    _LocationInput(
                      icon: Icons.location_on,
                      iconColor: AppColors.brandAccent,
                      hint: 'Destino',
                      controller: destinationCtrl,
                      autofocus: stop == _SheetStop.half,
                      onChanged: onDestinationChanged,
                      onTap: stop == _SheetStop.half ? onFullExpand : null,
                    ),
                  ],

                  // ── Full: opciones horario + CTA ──
                  if (stop == _SheetStop.full) ...[
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        _ScheduleChip(
                          label: 'Para ahora',
                          selected: !scheduleMode,
                          onTap: scheduleMode ? onScheduleToggle : null,
                        ),
                        const SizedBox(width: 8),
                        _ScheduleChip(
                          label: 'Programar',
                          selected: scheduleMode,
                          onTap: !scheduleMode ? onScheduleToggle : null,
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: hasDestination ? onRequestRide : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.brandAccent,
                        disabledBackgroundColor:
                            AppColors.brandAccent.withValues(alpha: 0.4),
                        minimumSize: const Size.fromHeight(56),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Text(
                        'Pedir remís',
                        style: theme.textTheme.titleMedium?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FrequentChip extends StatelessWidget {
  const _FrequentChip({required this.label, required this.icon});

  final String label;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return ActionChip(
      avatar: Icon(icon, size: 16),
      label: Text(label),
      onPressed: () {},
      padding: const EdgeInsets.symmetric(horizontal: 4),
    );
  }
}

class _LocationInput extends StatelessWidget {
  const _LocationInput({
    required this.icon,
    required this.iconColor,
    required this.hint,
    this.controller,
    this.readOnly = false,
    this.autofocus = false,
    this.onChanged,
    this.onTap,
  });

  final IconData icon;
  final Color iconColor;
  final String hint;
  final TextEditingController? controller;
  final bool readOnly;
  final bool autofocus;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: iconColor, size: 20),
        const SizedBox(width: 12),
        Expanded(
          child: TextField(
            controller: controller,
            readOnly: readOnly,
            autofocus: autofocus,
            onChanged: onChanged,
            onTap: onTap,
            decoration: InputDecoration(
              hintText: hint,
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
              contentPadding: EdgeInsets.zero,
              isDense: true,
            ),
            style: Theme.of(context).textTheme.bodyLarge,
          ),
        ),
      ],
    );
  }
}

class _ScheduleChip extends StatelessWidget {
  const _ScheduleChip({
    required this.label,
    required this.selected,
    this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? cs.primary : cs.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: selected ? cs.primary : cs.outline,
          ),
        ),
        child: Text(
          label,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: selected ? Colors.white : cs.onSurface,
                fontWeight: FontWeight.w500,
              ),
        ),
      ),
    );
  }
}
