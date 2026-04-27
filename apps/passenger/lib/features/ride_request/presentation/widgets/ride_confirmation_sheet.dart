import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:remis_flutter_core/flutter_core.dart';

import '../../data/models/destination_result.dart';
import '../../data/models/ride_model.dart';
import '../../data/ride_providers.dart';
import '../../data/ride_repository.dart';
import '../../../../core/theme/app_theme.dart';

// ---------------------------------------------------------------------------
// Payment method enum
// ---------------------------------------------------------------------------

enum _PaymentMethod { cash, mercadoPago }

// ---------------------------------------------------------------------------
// Public widget
// ---------------------------------------------------------------------------

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

class _RideConfirmationSheetState
    extends ConsumerState<RideConfirmationSheet> {
  _PaymentMethod _payment = _PaymentMethod.cash;
  final _notesController = TextEditingController();
  bool _submitting = false;

  String get _fareKey =>
      '${widget.pickup.latitude},${widget.pickup.longitude}'
      '|'
      '${widget.dest.location.latitude},${widget.dest.location.longitude}';

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Build
  // -------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final fareAsync = ref.watch(fareEstimateProvider(_fareKey));
    final theme = Theme.of(context);
    final bottom = MediaQuery.of(context).viewInsets.bottom;

    return SingleChildScrollView(
      padding: EdgeInsets.only(bottom: bottom + 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Drag handle
          const _DragHandle(),
          const SizedBox(height: 20),

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Origin section
                _SectionLabel('ORIGEN', theme),
                const SizedBox(height: 8),
                _RouteRow(
                  icon: const _DotIcon(color: AppColors.brandPrimary),
                  text: widget.pickupAddress ?? 'Mi ubicación',
                ),
                const SizedBox(height: 16),

                // Destination section
                _SectionLabel('DESTINO', theme),
                const SizedBox(height: 8),
                _RouteRow(
                  icon: const Icon(
                    Icons.flag,
                    size: 18,
                    color: AppColors.brandAccent,
                  ),
                  text: widget.dest.label,
                ),
                const SizedBox(height: 20),

                // Fare estimate section
                _SectionLabel('ESTIMADO', theme),
                const SizedBox(height: 8),
                fareAsync.when(
                  loading: () => const _FarePlaceholder(),
                  error: (_, __) => _FareError(
                    onRetry: () =>
                        ref.invalidate(fareEstimateProvider(_fareKey)),
                  ),
                  data: (fare) => _FareDisplay(
                    fare: fare,
                    theme: theme,
                    onTap: fare.breakdown != null
                        ? () =>
                            _showBreakdownDialog(context, fare.breakdown!)
                        : null,
                  ),
                ),
                const SizedBox(height: 20),

                // Payment section
                _SectionLabel('PAGO', theme),
                const SizedBox(height: 8),
                _PaymentSelector(
                  selected: _payment,
                  onChanged: (v) => setState(() => _payment = v),
                ),
                const SizedBox(height: 20),

                // Notes section
                _SectionLabel('NOTAS (OPCIONAL)', theme),
                const SizedBox(height: 8),
                TextField(
                  controller: _notesController,
                  maxLength: 200,
                  maxLines: 3,
                  textInputAction: TextInputAction.done,
                  decoration: const InputDecoration(
                    hintText: 'esperar en el portón...',
                  ),
                ),
                const SizedBox(height: 24),

                // CTA button
                _CtaButton(
                  enabled: fareAsync.hasValue && !_submitting,
                  submitting: _submitting,
                  onPressed: () => _requestRide(context),
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
// Private sub-widgets — all const-constructible where possible
// ---------------------------------------------------------------------------

class _DragHandle extends StatelessWidget {
  const _DragHandle();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.only(top: 12),
        child: Container(
          width: 44,
          height: 4,
          decoration: BoxDecoration(
            color: AppColors.neutral300,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text, this.theme);

  final String text;
  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: theme.textTheme.bodySmall?.copyWith(
        color: AppColors.neutral500,
        letterSpacing: 0.8,
      ),
    );
  }
}

class _DotIcon extends StatelessWidget {
  const _DotIcon({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 12,
      height: 12,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
      ),
    );
  }
}

class _RouteRow extends StatelessWidget {
  const _RouteRow({required this.icon, required this.text});

  final Widget icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.neutral200),
        borderRadius: BorderRadius.circular(8),
        color: AppColors.neutral50,
      ),
      child: Row(
        children: [
          icon,
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: Theme.of(context).textTheme.bodyMedium,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Fare display states
// ---------------------------------------------------------------------------

class _FarePlaceholder extends StatelessWidget {
  const _FarePlaceholder();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _ShimmerBox(width: 100, height: 32),
        const SizedBox(width: 16),
        _ShimmerBox(width: 60, height: 20),
        const SizedBox(width: 16),
        _ShimmerBox(width: 60, height: 20),
      ],
    );
  }
}

class _ShimmerBox extends StatefulWidget {
  const _ShimmerBox({required this.width, required this.height});

  final double width;
  final double height;

  @override
  State<_ShimmerBox> createState() => _ShimmerBoxState();
}

class _ShimmerBoxState extends State<_ShimmerBox>
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
    _anim = Tween<double>(begin: 0.4, end: 1.0).animate(_ctrl);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _anim,
      child: Container(
        width: widget.width,
        height: widget.height,
        decoration: BoxDecoration(
          color: AppColors.neutral200,
          borderRadius: BorderRadius.circular(6),
        ),
      ),
    );
  }
}

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

class _FareDisplay extends StatelessWidget {
  const _FareDisplay({
    required this.fare,
    required this.theme,
    required this.onTap,
  });

  final dynamic fare; // FareEstimateModel
  final ThemeData theme;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            GestureDetector(
              onTap: onTap,
              child: Text(
                formatArs(
                  (fare.estimatedAmountArs as double),
                  showDecimals: false,
                ),
                style: theme.textTheme.headlineLarge?.copyWith(
                  color: AppColors.brandPrimary,
                  decoration: onTap != null
                      ? TextDecoration.underline
                      : TextDecoration.none,
                  decorationColor: AppColors.brandPrimary,
                ),
              ),
            ),
            const SizedBox(width: 16),
            Text(
              '${(fare.etaMinutes as int)} min',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AppColors.neutral500,
              ),
            ),
            const SizedBox(width: 12),
            Text(
              '${(fare.distanceKm as int)} km',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AppColors.neutral500,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          'Tarifa según ordenanza',
          style: theme.textTheme.bodySmall?.copyWith(
            color: AppColors.neutral400,
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Payment selector
// ---------------------------------------------------------------------------

class _PaymentSelector extends StatelessWidget {
  const _PaymentSelector({
    required this.selected,
    required this.onChanged,
  });

  final _PaymentMethod selected;
  final void Function(_PaymentMethod) onChanged;

  // Mercado Pago is disabled per feature flags seed — hardcoded off for now.
  static const bool _mpEnabled = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        _PaymentOption(
          label: 'Efectivo',
          selected: selected == _PaymentMethod.cash,
          enabled: true,
          onTap: () => onChanged(_PaymentMethod.cash),
          theme: theme,
        ),
        const SizedBox(width: 12),
        _PaymentOption(
          label: 'Mercado Pago',
          selected: selected == _PaymentMethod.mercadoPago,
          enabled: _mpEnabled,
          onTap: _mpEnabled
              ? () => onChanged(_PaymentMethod.mercadoPago)
              : null,
          theme: theme,
        ),
      ],
    );
  }
}

class _PaymentOption extends StatelessWidget {
  const _PaymentOption({
    required this.label,
    required this.selected,
    required this.enabled,
    required this.onTap,
    required this.theme,
  });

  final String label;
  final bool selected;
  final bool enabled;
  final VoidCallback? onTap;
  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    final effectiveColor = enabled
        ? (selected ? AppColors.brandPrimary : AppColors.neutral500)
        : AppColors.neutral300;

    return GestureDetector(
      onTap: enabled ? onTap : null,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            selected ? Icons.radio_button_checked : Icons.radio_button_off,
            size: 20,
            color: effectiveColor,
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: effectiveColor,
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// CTA button
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
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: FilledButton(
        onPressed: enabled ? onPressed : null,
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.brandAccent,
          foregroundColor: Colors.white,
          disabledBackgroundColor: AppColors.neutral200,
          disabledForegroundColor: AppColors.neutral400,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        child: submitting
            ? const CircularProgressIndicator.adaptive(
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              )
            : const Text(
                'Pedir remís',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                ),
              ),
      ),
    );
  }
}
