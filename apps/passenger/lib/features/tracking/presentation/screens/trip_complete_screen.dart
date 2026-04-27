import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:remis_flutter_core/flutter_core.dart';

import '../../../ride_request/data/models/driver_info_model.dart';
import '../../../ride_request/data/models/ride_model.dart';
import '../../../ride_request/data/ride_repository.dart';
import '../../../../core/theme/app_theme.dart';

class TripCompleteScreen extends ConsumerStatefulWidget {
  const TripCompleteScreen({
    super.key,
    required this.ride,
    this.driver,
  });

  final RideModel ride;
  final DriverInfoModel? driver;

  @override
  ConsumerState<TripCompleteScreen> createState() => _TripCompleteScreenState();
}

class _TripCompleteScreenState extends ConsumerState<TripCompleteScreen> {
  int _stars = 0;
  bool _isSubmitting = false;
  final _commentController = TextEditingController();

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  // ---------------------------------------------------------------------------
  // Trip summary helpers
  // ---------------------------------------------------------------------------

  String get _distanceLabel {
    final d = widget.ride.distanceMeters;
    if (d == null) return '—';
    return '${(d / 1000).toStringAsFixed(1)} km';
  }

  String get _durationLabel {
    final start = widget.ride.startedAt;
    final end = widget.ride.endedAt;
    if (start == null || end == null) return '—';
    final minutes = end.difference(start).inMinutes;
    return '$minutes min';
  }

  String get _fareLabel =>
      formatArs(
        widget.ride.finalFareArs ?? widget.ride.estimatedFareArs ?? 0,
        showDecimals: false,
      );

  String get _paymentLabel =>
      widget.ride.paymentMethod == 'cash' ? 'Efectivo' : 'Mercado Pago';

  // ---------------------------------------------------------------------------
  // Driver avatar initials
  // ---------------------------------------------------------------------------

  String _initials(String fullName) {
    return fullName
        .split(' ')
        .map((w) => w.isNotEmpty ? w[0] : '')
        .where((c) => c.isNotEmpty)
        .take(2)
        .join()
        .toUpperCase();
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  Future<void> _submit() async {
    if (_stars == 0 || _isSubmitting) return;

    setState(() => _isSubmitting = true);

    try {
      await ref.read(rideRepositoryProvider).submitRating(
            rideId: widget.ride.id,
            driverId: widget.driver!.id,
            stars: _stars,
            comment: _commentController.text.trim().isEmpty
                ? null
                : _commentController.text.trim(),
          );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('¡Gracias por tu calificación!')),
      );
      context.go('/home');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error al enviar: $e')),
      );
      setState(() => _isSubmitting = false);
    }
  }

  void _skip() => context.go('/home');

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasDriver = widget.driver != null;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // ── Header ──────────────────────────────────────────────────────
              const Icon(
                Icons.check_circle,
                size: 64,
                color: AppColors.success,
              ),
              const SizedBox(height: 12),
              Text(
                'Viaje finalizado',
                style: theme.textTheme.headlineMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),

              // ── Driver info ─────────────────────────────────────────────────
              if (hasDriver) ...[
                CircleAvatar(
                  radius: 28,
                  backgroundColor: AppColors.brandPrimary,
                  child: Text(
                    _initials(widget.driver!.fullName),
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: AppColors.neutral0,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '${widget.driver!.fullName} · Móvil ${widget.driver!.mobileNumber}',
                  style: theme.textTheme.titleMedium,
                  textAlign: TextAlign.center,
                ),
                if (widget.driver!.vehicleType != null ||
                    widget.driver!.plate != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    [
                      if (widget.driver!.vehicleType != null)
                        widget.driver!.vehicleType!,
                      if (widget.driver!.plate != null) widget.driver!.plate!,
                    ].join(' · '),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.neutral500,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ],

              const SizedBox(height: 24),
              const Divider(),
              const SizedBox(height: 16),

              // ── Trip summary ────────────────────────────────────────────────
              Text(
                '$_distanceLabel · $_durationLabel',
                style: theme.textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 6),
              Text(
                '$_fareLabel — $_paymentLabel',
                style: theme.textTheme.headlineMedium?.copyWith(
                  color: AppColors.brandAccent,
                ),
                textAlign: TextAlign.center,
              ),

              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 20),

              // ── Rating section ──────────────────────────────────────────────
              if (!hasDriver) ...[
                Text(
                  'Rating no disponible',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: AppColors.neutral500,
                  ),
                  textAlign: TextAlign.center,
                ),
              ] else ...[
                Text(
                  '¿Cómo estuvo?',
                  style: theme.textTheme.bodyLarge,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                _StarRow(
                  stars: _stars,
                  onTap: (n) => setState(() => _stars = n),
                ),
                const SizedBox(height: 12),

                // Comment field fades in once stars are selected
                AnimatedOpacity(
                  opacity: _stars > 0 ? 1.0 : 0.0,
                  duration: const Duration(milliseconds: 250),
                  child: AnimatedSize(
                    duration: const Duration(milliseconds: 250),
                    child: _stars > 0
                        ? TextField(
                            controller: _commentController,
                            maxLength: 300,
                            maxLines: 3,
                            decoration: const InputDecoration(
                              hintText: 'Comentar (opcional)',
                            ),
                          )
                        : const SizedBox.shrink(),
                  ),
                ),
              ],

              const SizedBox(height: 24),

              // ── Buttons ─────────────────────────────────────────────────────
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.brandAccent,
                    foregroundColor: AppColors.neutral0,
                  ),
                  onPressed:
                      (hasDriver && _stars > 0 && !_isSubmitting) ? _submit : null,
                  child: _isSubmitting
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.neutral0,
                          ),
                        )
                      : const Text('Enviar calificación'),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: _skip,
                  child: const Text('Saltar'),
                ),
              ),
              SizedBox(
                width: double.infinity,
                child: TextButton.icon(
                  icon: const Icon(Icons.replay, size: 16),
                  label: const Text('Volver a pedir al mismo destino'),
                  onPressed: () => context.go('/home'),
                ),
              ),

              // Bottom safe-area breathing room
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Star row widget
// ──────────────────────────────────────────────────────────────────────────────

class _StarRow extends StatelessWidget {
  const _StarRow({required this.stars, required this.onTap});

  final int stars;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(5, (index) {
        final filled = index < stars;
        return GestureDetector(
          onTap: () => onTap(index + 1),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Icon(
              filled ? Icons.star : Icons.star_border,
              size: 36,
              color: filled ? AppColors.brandAccent : AppColors.neutral300,
            ),
          ),
        );
      }),
    );
  }
}
