import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:remis_design_system/remis_design_system.dart';
import 'package:remis_driver/features/ride/data/ride_model.dart';
import 'package:remis_driver/shared/widgets/r_premium_action_button.dart';

class RideOfferModal extends StatefulWidget {
  const RideOfferModal({
    super.key,
    required this.offer,
    required this.onAccept,
    required this.onReject,
    required this.onExpired,
  });

  final RideModel offer;
  final VoidCallback onAccept;
  final VoidCallback onReject;
  final VoidCallback onExpired;

  @override
  State<RideOfferModal> createState() => _RideOfferModalState();
}

class _RideOfferModalState extends State<RideOfferModal> {
  static const int _totalSeconds = 30;

  late int _remaining;
  Timer? _timer;
  bool _accepting = false;

  @override
  void initState() {
    super.initState();
    _remaining = _totalSeconds;
    _timer = Timer.periodic(const Duration(seconds: 1), _tick);
  }

  void _tick(Timer t) {
    if (!mounted) return;
    setState(() => _remaining--);
    if (_remaining <= 0) {
      _timer?.cancel();
      widget.onExpired();
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Widget _infoRow({
    required IconData icon,
    required String text,
    Color? iconColor,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: RSpacing.s8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: iconColor ?? kNeutral900Light),
          const SizedBox(width: RSpacing.s12),
          Expanded(
            child: Text(
              text,
              style: inter(
                fontSize: RTextSize.base,
                color: kNeutral900Light,
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final offer = widget.offer;
    final timerColor =
        _remaining < 10 ? kDanger : kNeutral900Light;
    final fareText = offer.estimatedFareArs != null
        ? '\$ ${offer.estimatedFareArs!.toStringAsFixed(2)}'
        : 'No especificada';
    final progress = _remaining / _totalSeconds;

    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      minChildSize: 0.5,
      maxChildSize: 0.85,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(
              top: Radius.circular(RRadius.xl),
            ),
          ),
          child: Column(
            children: [
              const SizedBox(height: RSpacing.s8),
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: kNeutral200Light,
                  borderRadius: BorderRadius.circular(RRadius.full),
                ),
              ),
              const SizedBox(height: RSpacing.s16),
              Expanded(
                child: SingleChildScrollView(
                  controller: scrollController,
                  padding: const EdgeInsets.symmetric(
                    horizontal: RSpacing.s24,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Text(
                            '¡Nuevo pedido!',
                            style: interTight(
                              fontSize: RTextSize.xl,
                              fontWeight: FontWeight.w800,
                              color: kBrandAccent,
                            ),
                          ),
                          SizedBox(
                            width: 56,
                            height: 56,
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                CircularProgressIndicator(
                                  value: progress,
                                  strokeWidth: 4,
                                  backgroundColor:
                                      kNeutral200Light,
                                  valueColor:
                                      AlwaysStoppedAnimation<Color>(
                                          timerColor),
                                ),
                                Text(
                                  '$_remaining',
                                  style: geistMono(
                                    fontSize: RTextSize.md,
                                    fontWeight: FontWeight.w700,
                                    color: timerColor,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: RSpacing.s20),
                      _infoRow(
                        icon: Icons.trip_origin,
                        text: offer.pickupAddress,
                        iconColor: kBrandPrimary,
                      ),
                      _infoRow(
                        icon: Icons.location_on,
                        text: offer.destAddress,
                        iconColor: kDanger,
                      ),
                      _infoRow(
                        icon: Icons.attach_money,
                        text: fareText,
                        iconColor: kSuccess,
                      ),
                      if (offer.notes != null && offer.notes!.isNotEmpty)
                        _infoRow(
                          icon: Icons.notes,
                          text: offer.notes!,
                        ),
                      const SizedBox(height: RSpacing.s32),
                      Row(
                        children: [
                          Expanded(
                            child: RPremiumActionButton(
                              label: 'Rechazar',
                              foregroundColor: kDanger,
                              backgroundColor: Colors.white,
                              onPressed:
                                  _accepting ? null : widget.onReject,
                            ),
                          ),
                          const SizedBox(width: RSpacing.s12),
                          Expanded(
                            child: RPremiumActionButton(
                              label: 'Aceptar',
                              backgroundColor: kSuccess,
                              isLoading: _accepting,
                              onPressed: _accepting
                                  ? null
                                  : () {
                                      setState(() => _accepting = true);
                                      widget.onAccept();
                                    },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: RSpacing.s24),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    )
        .animate()
        .slideY(
          begin: 1.0,
          end: 0.0,
          duration: 400.ms,
          curve: Curves.easeOutBack,
        );
  }
}
