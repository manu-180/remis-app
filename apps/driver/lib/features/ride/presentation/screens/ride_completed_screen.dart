import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:remis_design_system/remis_design_system.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:remis_driver/features/ride/data/ride_model.dart';
import 'package:remis_driver/shared/widgets/r_premium_action_button.dart';

class RideCompletedScreen extends ConsumerStatefulWidget {
  const RideCompletedScreen({
    super.key,
    required this.ride,
    required this.onDone,
  });

  final RideModel ride;
  final VoidCallback onDone;

  @override
  ConsumerState<RideCompletedScreen> createState() =>
      _RideCompletedScreenState();
}

class _RideCompletedScreenState extends ConsumerState<RideCompletedScreen> {
  int _selectedStars = 0;
  bool _ratingSubmitted = false;
  bool _submitting = false;
  bool _alreadyRated = false;

  @override
  void initState() {
    super.initState();
    _checkExistingRating();
  }

  Future<void> _checkExistingRating() async {
    try {
      final result = await Supabase.instance.client
          .from('ride_ratings')
          .select('id')
          .eq('ride_id', widget.ride.id)
          .maybeSingle();
      if (result != null && mounted) {
        setState(() => _alreadyRated = true);
      }
    } catch (_) {}
  }

  Future<void> _submitRating() async {
    if (_selectedStars == 0 || _submitting) return;
    setState(() => _submitting = true);
    try {
      final client = Supabase.instance.client;
      final uid = client.auth.currentUser!.id;
      await client.from('ride_ratings').insert({
        'ride_id': widget.ride.id,
        'passenger_id': widget.ride.passengerId,
        'driver_id': uid,
        'stars': _selectedStars,
      });
      if (mounted) setState(() => _ratingSubmitted = true);
    } catch (_) {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final double distanceKm = (widget.ride.distanceMeters ?? 0) / 1000;
    final int durationMin =
        (widget.ride.startedAt != null && widget.ride.endedAt != null)
            ? widget.ride.endedAt!.difference(widget.ride.startedAt!).inMinutes
            : 0;
    final double fare =
        widget.ride.finalFareArs ?? widget.ride.estimatedFareArs ?? 0.0;

    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text(
          'Viaje completado',
          style: interTight(
            fontSize: RTextSize.lg,
            fontWeight: FontWeight.w700,
            color: kSuccess,
          ),
        ),
      ),
      backgroundColor: Colors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(
            horizontal: RSpacing.s24,
            vertical: RSpacing.s20,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: RSpacing.s12),
              Container(
                width: 96,
                height: 96,
                decoration: const BoxDecoration(
                  color: kSuccessBg,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check_rounded,
                  size: 56,
                  color: kSuccess,
                ),
              )
                  .animate()
                  .scale(
                    begin: const Offset(0, 0),
                    end: const Offset(1.1, 1.1),
                    duration: 350.ms,
                    curve: Curves.easeOutBack,
                  )
                  .then()
                  .scale(
                    begin: const Offset(1.1, 1.1),
                    end: const Offset(1.0, 1.0),
                    duration: 150.ms,
                    curve: Curves.easeIn,
                  ),
              const SizedBox(height: RSpacing.s20),
              Text(
                '¡Viaje completado!',
                style: interTight(
                  fontSize: RTextSize.xl,
                  fontWeight: FontWeight.w800,
                  color: kNeutral900Light,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: RSpacing.s32),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: RSpacing.s16,
                  vertical: RSpacing.s20,
                ),
                decoration: BoxDecoration(
                  color: kSuccessBg,
                  borderRadius: BorderRadius.circular(RRadius.lg),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _StatCell(
                      label: 'km',
                      value: distanceKm,
                      decimals: 1,
                      delay: 0.ms,
                    ),
                    _Divider(),
                    _StatCell(
                      label: 'min',
                      value: durationMin.toDouble(),
                      decimals: 0,
                      delay: 150.ms,
                    ),
                    _Divider(),
                    _StatCell(
                      label: r'$',
                      valueSuffix: true,
                      value: fare,
                      decimals: 2,
                      delay: 300.ms,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: RSpacing.s32),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(RSpacing.s16),
                decoration: BoxDecoration(
                  color: const Color(0xFFF7F7F7),
                  borderRadius: BorderRadius.circular(RRadius.md),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _AddressRow(
                      icon: Icons.trip_origin,
                      iconColor: kBrandPrimary,
                      label: 'Origen',
                      address: widget.ride.pickupAddress,
                    ),
                    Padding(
                      padding: const EdgeInsets.only(
                          left: 8, top: RSpacing.s4, bottom: RSpacing.s4),
                      child: Container(
                        width: 1.5,
                        height: 20,
                        color: kNeutral200Light,
                      ),
                    ),
                    _AddressRow(
                      icon: Icons.location_on,
                      iconColor: kDanger,
                      label: 'Destino',
                      address: widget.ride.destAddress,
                    ),
                  ],
                ),
              ),

              // -- Rating widget --
              if (!_alreadyRated) ...[
                const SizedBox(height: RSpacing.s32),
                _PassengerRating(
                  selectedStars: _selectedStars,
                  submitted: _ratingSubmitted,
                  submitting: _submitting,
                  onStarTap: (stars) {
                    if (!_ratingSubmitted) {
                      setState(() => _selectedStars = stars);
                    }
                  },
                  onSubmit: _submitRating,
                ),
              ],

              const SizedBox(height: RSpacing.s32),
              SizedBox(
                width: double.infinity,
                child: RPremiumActionButton(
                  label: 'Volver al inicio',
                  icon: Icons.home_outlined,
                  onPressed: widget.onDone,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// -- Passenger rating --------------------------------------------------------

class _PassengerRating extends StatelessWidget {
  const _PassengerRating({
    required this.selectedStars,
    required this.submitted,
    required this.submitting,
    required this.onStarTap,
    required this.onSubmit,
  });

  final int selectedStars;
  final bool submitted;
  final bool submitting;
  final ValueChanged<int> onStarTap;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(RSpacing.s20),
      decoration: BoxDecoration(
        color: const Color(0xFFF7F7F7),
        borderRadius: BorderRadius.circular(RRadius.lg),
      ),
      child: Column(
        children: [
          Text(
            submitted ? '¡Gracias!' : '¿Cómo fue el pasajero?',
            style: interTight(
              fontSize: RTextSize.base,
              fontWeight: FontWeight.w600,
              color: kNeutral900Light,
            ),
          ),
          const SizedBox(height: RSpacing.s12),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(5, (i) {
              final star = i + 1;
              return GestureDetector(
                onTap: () => onStarTap(star),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: Icon(
                    star <= selectedStars ? Icons.star_rounded : Icons.star_outline_rounded,
                    size: 40,
                    color: star <= selectedStars ? kBrandAccent : kNeutral300Light,
                  ),
                ),
              );
            }),
          ),
          if (selectedStars > 0 && !submitted) ...[
            const SizedBox(height: RSpacing.s16),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: submitting ? null : onSubmit,
                child: submitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text('Enviar calificación'),
              ),
            ),
          ],
        ],
      ),
    )
        .animate()
        .fadeIn(duration: 400.ms, delay: 500.ms)
        .slideY(begin: 0.1, end: 0, duration: 400.ms, delay: 500.ms);
  }
}

// -- Existing helpers (unchanged) -------------------------------------------

class _Divider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 1,
      height: 40,
      color: kSuccess.withValues(alpha: 0.3),
    );
  }
}

class _StatCell extends StatelessWidget {
  const _StatCell({
    required this.label,
    required this.value,
    required this.decimals,
    required this.delay,
    this.valueSuffix = false,
  });

  final String label;
  final double value;
  final int decimals;
  final Duration delay;
  final bool valueSuffix;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        if (!valueSuffix)
          Text(
            label,
            style: inter(
              fontSize: RTextSize.xs,
              fontWeight: FontWeight.w500,
              color: kSuccess,
            ),
          ),
        const SizedBox(height: 2),
        _CountUp(
          target: value,
          decimals: decimals,
          delay: delay,
        ),
        if (valueSuffix)
          Text(
            label,
            style: inter(
              fontSize: RTextSize.xs,
              fontWeight: FontWeight.w500,
              color: kSuccess,
            ),
          ),
      ],
    );
  }
}

class _CountUp extends StatelessWidget {
  const _CountUp({
    required this.target,
    required this.decimals,
    required this.delay,
  });

  final double target;
  final int decimals;
  final Duration delay;

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0, end: target),
      duration: 600.ms,
      curve: Curves.easeOut,
      builder: (context, val, _) {
        return Text(
          val.toStringAsFixed(decimals),
          style: geistMono(
            fontSize: RTextSize.xl,
            fontWeight: FontWeight.w700,
            color: kNeutral900Light,
          ),
        );
      },
    )
        .animate(delay: delay)
        .fadeIn(duration: 200.ms);
  }
}

class _AddressRow extends StatelessWidget {
  const _AddressRow({
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.address,
  });

  final IconData icon;
  final Color iconColor;
  final String label;
  final String address;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: iconColor),
        const SizedBox(width: RSpacing.s12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: inter(
                  fontSize: RTextSize.xs,
                  fontWeight: FontWeight.w500,
                  color: kSuccess,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                address,
                style: inter(
                  fontSize: RTextSize.sm,
                  color: kNeutral900Light,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
