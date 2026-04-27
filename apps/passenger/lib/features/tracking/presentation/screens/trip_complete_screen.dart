import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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

class _TripCompleteScreenState extends ConsumerState<TripCompleteScreen>
    with TickerProviderStateMixin {
  int _stars = 0;
  bool _isSubmitting = false;
  final _commentController = TextEditingController();

  // Animated check entrance
  late final AnimationController _checkCtrl;
  late final Animation<double> _checkScale;

  // Fare CountUp
  late final AnimationController _fareCtrl;
  late final Animation<double> _fareAnim;

  // Star tap scale (one per star)
  late final List<AnimationController> _starCtrls;
  late final List<Animation<double>> _starScales;

  @override
  void initState() {
    super.initState();

    // Check: 0 → 1.15 → 1.0
    _checkCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 550),
    );
    _checkScale = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween(begin: 0.0, end: 1.15)
            .chain(CurveTween(curve: Curves.easeOut)),
        weight: 70,
      ),
      TweenSequenceItem(
        tween: Tween(begin: 1.15, end: 1.0)
            .chain(CurveTween(curve: Curves.easeInOut)),
        weight: 30,
      ),
    ]).animate(_checkCtrl);

    // CountUp fare
    final fare =
        (widget.ride.finalFareArs ?? widget.ride.estimatedFareArs ?? 0)
            .toDouble();
    _fareCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _fareAnim = Tween<double>(begin: 0, end: fare).animate(
      CurvedAnimation(parent: _fareCtrl, curve: Curves.easeOut),
    );

    // Stars
    _starCtrls = List.generate(
      5,
      (_) => AnimationController(
        vsync: this,
        duration: const Duration(milliseconds: 200),
      ),
    );
    _starScales = _starCtrls.map((ctrl) {
      return TweenSequence<double>([
        TweenSequenceItem(
          tween: Tween(begin: 1.0, end: 1.45)
              .chain(CurveTween(curve: Curves.easeOut)),
          weight: 50,
        ),
        TweenSequenceItem(
          tween: Tween(begin: 1.45, end: 1.0)
              .chain(CurveTween(curve: Curves.easeIn)),
          weight: 50,
        ),
      ]).animate(ctrl);
    }).toList();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkCtrl.forward();
      Future.delayed(const Duration(milliseconds: 250), () {
        if (mounted) _fareCtrl.forward();
      });
    });
  }

  @override
  void dispose() {
    _commentController.dispose();
    _checkCtrl.dispose();
    _fareCtrl.dispose();
    for (final c in _starCtrls) {
      c.dispose();
    }
    super.dispose();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  String get _distanceLabel {
    final d = widget.ride.distanceMeters;
    if (d == null) return '—';
    return '${(d / 1000).toStringAsFixed(1)} km';
  }

  String get _durationLabel {
    final start = widget.ride.startedAt;
    final end = widget.ride.endedAt;
    if (start == null || end == null) return '—';
    return '${end.difference(start).inMinutes} min';
  }

  String get _paymentLabel =>
      widget.ride.paymentMethod == 'cash' ? 'Efectivo' : 'Mercado Pago';

  String get _timeLabel {
    final t = widget.ride.endedAt ?? widget.ride.startedAt;
    if (t == null) return '';
    final h = t.hour.toString().padLeft(2, '0');
    final m = t.minute.toString().padLeft(2, '0');
    return 'Hoy $h:$m';
  }

  String _initials(String name) => name
      .split(' ')
      .where((w) => w.isNotEmpty)
      .take(2)
      .map((w) => w[0].toUpperCase())
      .join();

  // ── Actions ────────────────────────────────────────────────────────────────

  void _onStarTap(int n) {
    HapticFeedback.lightImpact();
    setState(() => _stars = n);
    for (int i = 0; i < n; i++) {
      Future.delayed(Duration(milliseconds: i * 80), () {
        if (mounted) _starCtrls[i].forward(from: 0);
      });
    }
  }

  Future<void> _submit() async {
    if (_stars == 0 || _isSubmitting) return;
    HapticFeedback.mediumImpact();
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
      context.go('/home');
    } catch (e) {
      if (!mounted) return;
      HapticFeedback.heavyImpact();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Algo salió mal — probá de nuevo. ($e)')),
      );
      setState(() => _isSubmitting = false);
    }
  }

  void _skip() => context.go('/home');

  void _copyReceipt() {
    HapticFeedback.lightImpact();
    final fare =
        widget.ride.finalFareArs ?? widget.ride.estimatedFareArs ?? 0;
    final lines = [
      'Recibo de viaje',
      '─────────────────',
      'Desde: ${widget.ride.pickupAddress ?? '—'}',
      'Hasta: ${widget.ride.destAddress ?? '—'}',
      '$_distanceLabel · $_durationLabel',
      if (_timeLabel.isNotEmpty) _timeLabel,
      '─────────────────',
      'Total: ${formatArs(fare, showDecimals: false)} ($_paymentLabel)',
      if (widget.driver != null)
        'Conductor: ${widget.driver!.fullName} · Móvil ${widget.driver!.mobileNumber}',
      if (widget.driver?.plate != null) 'Vehículo: ${widget.driver!.plate}',
    ];
    Clipboard.setData(ClipboardData(text: lines.join('\n')));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Recibo copiado al portapapeles')),
    );
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final hasDriver = widget.driver != null;
    final subtleColor =
        isDark ? AppColors.neutralD500 : AppColors.neutral500;
    final cardBg = isDark ? AppColors.neutralD200 : AppColors.neutral100;
    final scaffoldBg = isDark
        ? AppColors.neutralD50
        : const Color(0xFFF0FDF4); // subtle green tint

    return Scaffold(
      backgroundColor: scaffoldBg,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // ── Animated check ──────────────────────────────────────────────
              ScaleTransition(
                scale: _checkScale,
                child: Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.success.withValues(alpha: 0.12),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.success.withValues(alpha: 0.3),
                        blurRadius: 24,
                        spreadRadius: 4,
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.check_rounded,
                    size: 44,
                    color: AppColors.success,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Viaje finalizado',
                style: theme.textTheme.headlineLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 28),

              // ── Receipt card ────────────────────────────────────────────────
              Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  color: cardBg,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black
                          .withValues(alpha: isDark ? 0.3 : 0.07),
                      blurRadius: 20,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    // Fare CountUp
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 24, 20, 2),
                      child: AnimatedBuilder(
                        animation: _fareAnim,
                        builder: (_, __) => Text(
                          formatArs(_fareAnim.value.round().toDouble(),
                              showDecimals: false),
                          style: theme.textTheme.displayMedium?.copyWith(
                            fontFeatures: const [
                              FontFeature.tabularFigures()
                            ],
                            color: isDark
                                ? AppColors.neutralD900
                                : AppColors.neutral900,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),
                    Text(
                      _paymentLabel,
                      style: theme.textTheme.bodyMedium
                          ?.copyWith(color: subtleColor),
                    ),
                    const SizedBox(height: 20),

                    _DashedDivider(
                        color: isDark
                            ? AppColors.neutralD300
                            : AppColors.neutral300),

                    // Route
                    Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 20, vertical: 16),
                      child: Column(
                        children: [
                          _RouteRow(
                            icon: Icons.trip_origin,
                            iconColor: AppColors.info,
                            text: widget.ride.pickupAddress ?? '—',
                          ),
                          const SizedBox(height: 10),
                          _RouteRow(
                            icon: Icons.flag_rounded,
                            iconColor: AppColors.brandAccent,
                            text: widget.ride.destAddress ?? '—',
                          ),
                        ],
                      ),
                    ),

                    _DashedDivider(
                        color: isDark
                            ? AppColors.neutralD300
                            : AppColors.neutral300),

                    // Stats
                    Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 20, vertical: 16),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _StatItem(
                              label: 'Distancia',
                              value: _distanceLabel),
                          _StatItem(
                              label: 'Duración',
                              value: _durationLabel),
                          if (_timeLabel.isNotEmpty)
                            _StatItem(
                                label: 'Hora', value: _timeLabel),
                        ],
                      ),
                    ),

                    if (hasDriver) ...[
                      _DashedDivider(
                          color: isDark
                              ? AppColors.neutralD300
                              : AppColors.neutral300),
                      Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 20, vertical: 14),
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 18,
                              backgroundColor: AppColors.brandPrimary,
                              child: Text(
                                _initials(widget.driver!.fullName),
                                style: theme.textTheme.bodySmall
                                    ?.copyWith(
                                  color: AppColors.neutral0,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment:
                                    CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${widget.driver!.fullName} · Móvil ${widget.driver!.mobileNumber}',
                                    style: theme.textTheme.bodyMedium,
                                  ),
                                  if (widget.driver!.vehicleType !=
                                          null ||
                                      widget.driver!.plate != null)
                                    Text(
                                      [
                                        if (widget.driver!.vehicleType !=
                                            null)
                                          widget.driver!.vehicleType!,
                                        if (widget.driver!.plate != null)
                                          widget.driver!.plate!,
                                      ].join(' · '),
                                      style: theme.textTheme.bodySmall
                                          ?.copyWith(color: subtleColor),
                                    ),
                                ],
                              ),
                            ),
                            Row(children: [
                              const Icon(Icons.star_rounded,
                                  size: 14,
                                  color: AppColors.brandAccent),
                              const SizedBox(width: 2),
                              Text(
                                widget.driver!.rating
                                    .toStringAsFixed(1),
                                style: theme.textTheme.bodySmall
                                    ?.copyWith(color: subtleColor),
                              ),
                            ]),
                          ],
                        ),
                      ),
                    ],

                    Padding(
                      padding:
                          const EdgeInsets.fromLTRB(20, 0, 20, 14),
                      child: TextButton.icon(
                        onPressed: _copyReceipt,
                        icon: const Icon(Icons.copy_rounded, size: 15),
                        label: const Text('Copiar recibo'),
                        style: TextButton.styleFrom(
                          foregroundColor: subtleColor,
                          textStyle: theme.textTheme.bodySmall,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 28),

              // ── Rating ──────────────────────────────────────────────────────
              if (hasDriver) ...[
                Text(
                  '¿Cómo estuvo?',
                  style: theme.textTheme.titleMedium,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 14),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(5, (i) {
                    final filled = i < _stars;
                    return GestureDetector(
                      onTap: () => _onStarTap(i + 1),
                      child: Padding(
                        padding:
                            const EdgeInsets.symmetric(horizontal: 6),
                        child: ScaleTransition(
                          scale: _starScales[i],
                          child: Icon(
                            filled
                                ? Icons.star_rounded
                                : Icons.star_border_rounded,
                            size: 40,
                            color: filled
                                ? AppColors.brandAccent
                                : (isDark
                                    ? AppColors.neutralD400
                                    : AppColors.neutral300),
                          ),
                        ),
                      ),
                    );
                  }),
                ),
                const SizedBox(height: 14),
                AnimatedSize(
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
                const SizedBox(height: 24),
              ],

              // ── Buttons ─────────────────────────────────────────────────────
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(0, 52),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: (hasDriver && _stars > 0 && !_isSubmitting)
                      ? _submit
                      : null,
                  child: _isSubmitting
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child:
                              CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Listo'),
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
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Supporting widgets ────────────────────────────────────────────────────────

class _DashedDivider extends StatelessWidget {
  const _DashedDivider({required this.color});
  final Color color;

  @override
  Widget build(BuildContext context) => CustomPaint(
        size: const Size(double.infinity, 1),
        painter: _DashedLinePainter(color: color),
      );
}

class _DashedLinePainter extends CustomPainter {
  const _DashedLinePainter({required this.color});
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1;
    double x = 0;
    const dashW = 6.0;
    const gap = 4.0;
    while (x < size.width) {
      canvas.drawLine(Offset(x, 0), Offset(x + dashW, 0), paint);
      x += dashW + gap;
    }
  }

  @override
  bool shouldRepaint(covariant _DashedLinePainter old) =>
      old.color != color;
}

class _RouteRow extends StatelessWidget {
  const _RouteRow(
      {required this.icon,
      required this.iconColor,
      required this.text});
  final IconData icon;
  final Color iconColor;
  final String text;

  @override
  Widget build(BuildContext context) => Row(
        children: [
          Icon(icon, size: 16, color: iconColor),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: Theme.of(context).textTheme.bodyMedium,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      );
}

class _StatItem extends StatelessWidget {
  const _StatItem({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return Column(
      children: [
        Text(
          value,
          style: theme.textTheme.titleSmall
              ?.copyWith(fontWeight: FontWeight.w600),
        ),
        Text(
          label,
          style: theme.textTheme.bodySmall?.copyWith(
            color: isDark ? AppColors.neutralD500 : AppColors.neutral500,
          ),
        ),
      ],
    );
  }
}
