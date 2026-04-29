import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:remis_flutter_core/flutter_core.dart';

import '../../data/models/destination_result.dart';
import '../../data/models/ride_model.dart';
import '../../data/ride_providers.dart';
import '../../data/ride_repository.dart';
import '../../../../core/theme/app_theme.dart';

enum _PaymentMethod { cash, mercadoPago }

class RideConfirmationSheet extends ConsumerStatefulWidget {
  const RideConfirmationSheet({
    super.key,
    required this.pickup,
    required this.dest,
    required this.pickupAddress,
    required this.onRideCreated,
  });

  final LatLng pickup;
  final DestinationResult dest;
  final String? pickupAddress;
  final void Function(RideModel) onRideCreated;

  @override
  ConsumerState<RideConfirmationSheet> createState() =>
      _RideConfirmationSheetState();
}

class _RideConfirmationSheetState extends ConsumerState<RideConfirmationSheet>
    with SingleTickerProviderStateMixin {
  _PaymentMethod _payment = _PaymentMethod.cash;
  final _notesController = TextEditingController();
  bool _submitting = false;

  late final AnimationController _entryCtrl;
  late final List<Animation<double>> _anims;

  String get _fareKey =>
      '${widget.pickup.latitude},${widget.pickup.longitude}'
      '|'
      '${widget.dest.location.latitude},${widget.dest.location.longitude}';

  @override
  void initState() {
    super.initState();
    _entryCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _anims = List.generate(
      5,
      (i) => CurvedAnimation(
        parent: _entryCtrl,
        curve: Interval(i * 0.1, 0.5 + i * 0.1, curve: Curves.easeOutCubic),
      ),
    );
    _entryCtrl.forward();
  }

  @override
  void dispose() {
    _entryCtrl.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _requestRide(BuildContext context) async {
    setState(() => _submitting = true);
    try {
      final repo = ref.read(rideRepositoryProvider);
      final ride = await repo.createRide(
        pickup: widget.pickup,
        dest: widget.dest.location,
        pickupAddress: widget.pickupAddress ?? 'Mi ubicación',
        destAddress: widget.dest.address,
        notes: _notesController.text.trim().isEmpty
            ? null
            : _notesController.text.trim(),
        paymentMethod:
            _payment == _PaymentMethod.cash ? 'cash' : 'mercado_pago',
      );
      if (!context.mounted) return;
      Navigator.of(context).pop();
      widget.onRideCreated(ride);
    } catch (e) {
      if (!context.mounted) return;
      setState(() => _submitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('No se pudo crear el viaje: $e'),
          backgroundColor: AppColors.danger,
        ),
      );
    }
  }

  void _showBreakdownDialog(
      BuildContext context, Map<String, dynamic> breakdown) {
    showDialog<void>(
      context: context,
      builder: (ctx) {
        final theme = Theme.of(ctx);
        final entries = breakdown.entries.toList();
        return AlertDialog(
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Detalle de tarifa'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              for (final entry in entries)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        _breakdownLabel(entry.key),
                        style: theme.textTheme.bodyMedium,
                      ),
                      Text(
                        formatArs(
                          (entry.value as num?)?.toDouble() ?? 0.0,
                          showDecimals: false,
                        ),
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cerrar'),
            ),
          ],
        );
      },
    );
  }

  String _breakdownLabel(String key) => switch (key) {
        'base' => 'Base',
        'per_km' => 'Por km',
        'night_surcharge' => 'Recargo nocturno',
        _ => key,
      };

  @override
  Widget build(BuildContext context) {
    final fareAsync = ref.watch(fareEstimateProvider(_fareKey));
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final surface = isDark ? AppColors.neutralD100 : Colors.white;
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    final dividerColor = isDark ? AppColors.neutralD200 : AppColors.neutral100;

    return Container(
      decoration: BoxDecoration(
        color: surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SingleChildScrollView(
        padding: EdgeInsets.only(bottom: bottom + 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Drag handle
            Padding(
              padding: const EdgeInsets.only(top: 12, bottom: 20),
              child: Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark ? AppColors.neutralD300 : AppColors.neutral300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // Route timeline
            _FadeSlideIn(
              animation: _anims[0],
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: _RouteTimeline(
                  pickupAddress: widget.pickupAddress ?? 'Mi ubicación',
                  destLabel: widget.dest.label,
                  destAddress: widget.dest.address,
                ),
              ),
            ),

            Divider(
                height: 32,
                indent: 20,
                endIndent: 20,
                thickness: 0.5,
                color: dividerColor),

            // Fare
            _FadeSlideIn(
              animation: _anims[1],
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: fareAsync.when(
                  loading: () => const _FareSkeleton(),
                  error: (_, __) => _FareError(
                    onRetry: () =>
                        ref.invalidate(fareEstimateProvider(_fareKey)),
                  ),
                  data: (fare) => _FareDisplay(
                    fare: fare,
                    onInfoTap: fare.breakdown != null
                        ? () =>
                            _showBreakdownDialog(context, fare.breakdown!)
                        : null,
                  ),
                ),
              ),
            ),

            Divider(
                height: 32,
                indent: 20,
                endIndent: 20,
                thickness: 0.5,
                color: dividerColor),

            // Payment
            _FadeSlideIn(
              animation: _anims[2],
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: _PaymentSelector(
                  selected: _payment,
                  onChanged: (v) => setState(() => _payment = v),
                ),
              ),
            ),

            Divider(
                height: 32,
                indent: 20,
                endIndent: 20,
                thickness: 0.5,
                color: dividerColor),

            // Notes
            _FadeSlideIn(
              animation: _anims[3],
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: _NotesField(controller: _notesController),
              ),
            ),

            const SizedBox(height: 24),

            // CTA
            _FadeSlideIn(
              animation: _anims[4],
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: _CtaButton(
                  enabled: fareAsync.hasValue && !_submitting,
                  submitting: _submitting,
                  onPressed: () => _requestRide(context),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Staggered fade + slide-up animation wrapper
// ---------------------------------------------------------------------------

class _FadeSlideIn extends StatelessWidget {
  const _FadeSlideIn({required this.animation, required this.child});

  final Animation<double> animation;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: animation,
      builder: (_, child) => Opacity(
        opacity: animation.value,
        child: Transform.translate(
          offset: Offset(0, 12 * (1 - animation.value)),
          child: child,
        ),
      ),
      child: child,
    );
  }
}

// ---------------------------------------------------------------------------
// Route timeline — vertical dots + connector line (Uber-style)
// ---------------------------------------------------------------------------

class _RouteTimeline extends StatelessWidget {
  const _RouteTimeline({
    required this.pickupAddress,
    required this.destLabel,
    required this.destAddress,
  });

  final String pickupAddress;
  final String destLabel;
  final String destAddress;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final lineColor = isDark ? AppColors.neutralD300 : AppColors.neutral200;

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 20,
            child: Column(
              children: [
                const SizedBox(height: 4),
                Container(
                  width: 10,
                  height: 10,
                  decoration: const BoxDecoration(
                    color: AppColors.success,
                    shape: BoxShape.circle,
                  ),
                ),
                Expanded(
                  child: Center(
                    child: Container(width: 1.5, color: lineColor),
                  ),
                ),
                Container(
                  width: 10,
                  height: 10,
                  decoration: const BoxDecoration(
                    color: AppColors.brandAccent,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(height: 4),
              ],
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  pickupAddress,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 24),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      destLabel,
                      style: theme.textTheme.bodyLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (destAddress != destLabel)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(
                          destAddress,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Fare display
// ---------------------------------------------------------------------------

class _FareDisplay extends StatelessWidget {
  const _FareDisplay({required this.fare, required this.onInfoTap});

  final dynamic fare;
  final VoidCallback? onInfoTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                formatArs(fare.estimatedAmountArs as double,
                    showDecimals: false),
                style: theme.textTheme.headlineLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 2),
              GestureDetector(
                onTap: onInfoTap,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Tarifa según ordenanza',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    if (onInfoTap != null) ...[
                      const SizedBox(width: 4),
                      Icon(
                        Icons.info_outline,
                        size: 14,
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
        _InfoChip(icon: Icons.schedule, text: '${fare.etaMinutes as int} min'),
        const SizedBox(width: 8),
        _InfoChip(
            icon: Icons.straighten, text: '${fare.distanceKm as int} km'),
      ],
    );
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: isDark ? AppColors.neutralD200 : AppColors.neutral100,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: theme.colorScheme.onSurfaceVariant),
          const SizedBox(width: 4),
          Text(
            text,
            style: theme.textTheme.bodySmall?.copyWith(
              fontWeight: FontWeight.w500,
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Fare loading skeleton
// ---------------------------------------------------------------------------

class _FareSkeleton extends StatefulWidget {
  const _FareSkeleton();

  @override
  State<_FareSkeleton> createState() => _FareSkeletonState();
}

class _FareSkeletonState extends State<_FareSkeleton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
    _anim = Tween<double>(begin: 0.3, end: 0.7).animate(_ctrl);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final color = isDark ? AppColors.neutralD300 : AppColors.neutral200;
    return FadeTransition(
      opacity: _anim,
      child: Row(
        children: [
          Container(
            width: 100,
            height: 36,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          const Spacer(),
          Container(
            width: 60,
            height: 28,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(14),
            ),
          ),
          const SizedBox(width: 8),
          Container(
            width: 50,
            height: 28,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(14),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Fare error
// ---------------------------------------------------------------------------

class _FareError extends StatelessWidget {
  const _FareError({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          '\$---',
          style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                color: AppColors.neutral400,
              ),
        ),
        const SizedBox(width: 12),
        TextButton.icon(
          onPressed: onRetry,
          icon: const Icon(Icons.refresh, size: 16),
          label: const Text('Reintentar'),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Payment selector — chip-style pills
// ---------------------------------------------------------------------------

class _PaymentSelector extends StatelessWidget {
  const _PaymentSelector({
    required this.selected,
    required this.onChanged,
  });

  final _PaymentMethod selected;
  final void Function(_PaymentMethod) onChanged;

  static const bool _mpEnabled = false;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _PaymentChip(
          icon: Icons.payments_outlined,
          label: 'Efectivo',
          selected: selected == _PaymentMethod.cash,
          enabled: true,
          onTap: () => onChanged(_PaymentMethod.cash),
        ),
        const SizedBox(width: 10),
        _PaymentChip(
          icon: Icons.account_balance_wallet_outlined,
          label: 'Mercado Pago',
          selected: selected == _PaymentMethod.mercadoPago,
          enabled: _mpEnabled,
          showBadge: !_mpEnabled,
          onTap:
              _mpEnabled ? () => onChanged(_PaymentMethod.mercadoPago) : null,
        ),
      ],
    );
  }
}

class _PaymentChip extends StatelessWidget {
  const _PaymentChip({
    required this.icon,
    required this.label,
    required this.selected,
    required this.enabled,
    this.showBadge = false,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final bool enabled;
  final bool showBadge;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final bgColor = !enabled
        ? (isDark ? AppColors.neutralD200 : AppColors.neutral100)
        : selected
            ? (isDark
                ? AppColors.brandPrimaryDark.withValues(alpha: 0.12)
                : AppColors.brandPrimary.withValues(alpha: 0.06))
            : (isDark ? AppColors.neutralD200 : AppColors.neutral100);

    final borderColor = !enabled
        ? Colors.transparent
        : selected
            ? (isDark
                ? AppColors.brandPrimaryDark.withValues(alpha: 0.4)
                : AppColors.brandPrimary.withValues(alpha: 0.25))
            : Colors.transparent;

    final textColor = !enabled
        ? (isDark ? AppColors.neutralD400 : AppColors.neutral400)
        : theme.colorScheme.onSurface;

    final iconColor = !enabled
        ? (isDark ? AppColors.neutralD400 : AppColors.neutral400)
        : selected
            ? AppColors.success
            : theme.colorScheme.onSurfaceVariant;

    return Expanded(
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          GestureDetector(
            onTap: enabled ? onTap : null,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: borderColor, width: 1.5),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(icon, size: 18, color: iconColor),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      label,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: textColor,
                        fontWeight:
                            selected ? FontWeight.w600 : FontWeight.w400,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (showBadge)
            Positioned(
              top: -8,
              right: -4,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.brandAccent,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text(
                  'PRÓXIMAMENTE',
                  style: TextStyle(
                    fontSize: 8,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                    letterSpacing: 0.5,
                    height: 1.2,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Notes field — compact single-line with icon
// ---------------------------------------------------------------------------

class _NotesField extends StatelessWidget {
  const _NotesField({required this.controller});

  final TextEditingController controller;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return TextField(
      controller: controller,
      maxLength: 200,
      maxLines: 1,
      textInputAction: TextInputAction.done,
      style: theme.textTheme.bodyMedium,
      decoration: InputDecoration(
        hintText: 'Nota para el conductor...',
        prefixIcon: Padding(
          padding: const EdgeInsets.only(left: 14, right: 10),
          child: Icon(
            Icons.edit_note,
            size: 20,
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        prefixIconConstraints:
            const BoxConstraints(minWidth: 0, minHeight: 0),
        counterText: '',
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(
            color: isDark
                ? AppColors.brandPrimaryDark.withValues(alpha: 0.4)
                : AppColors.brandPrimary.withValues(alpha: 0.3),
            width: 1.5,
          ),
        ),
        filled: true,
        fillColor: isDark ? AppColors.neutralD200 : AppColors.neutral50,
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// CTA button — premium dark with AnimatedSwitcher
// ---------------------------------------------------------------------------

class _CtaButton extends StatelessWidget {
  const _CtaButton({
    required this.enabled,
    required this.submitting,
    required this.onPressed,
  });

  final bool enabled;
  final bool submitting;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: FilledButton(
        onPressed: enabled ? onPressed : null,
        style: FilledButton.styleFrom(
          backgroundColor:
              isDark ? AppColors.brandPrimaryDark : AppColors.brandPrimary,
          foregroundColor: isDark ? AppColors.neutralD0 : Colors.white,
          disabledBackgroundColor:
              isDark ? AppColors.neutralD200 : AppColors.neutral200,
          disabledForegroundColor:
              isDark ? AppColors.neutralD400 : AppColors.neutral400,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          elevation: enabled ? 2 : 0,
          shadowColor:
              (isDark ? AppColors.brandPrimaryDark : AppColors.brandPrimary)
                  .withValues(alpha: 0.3),
        ),
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 200),
          child: submitting
              ? SizedBox(
                  key: const ValueKey('loading'),
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      isDark ? AppColors.neutralD0 : Colors.white,
                    ),
                  ),
                )
              : Text(
                  key: const ValueKey('text'),
                  'Pedir remís',
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.3,
                  ),
                ),
        ),
      ),
    );
  }
}
