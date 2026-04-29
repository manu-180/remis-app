import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:remis_design_system/remis_design_system.dart';
import 'package:remis_flutter_core/flutter_core.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:remis_driver/features/ride/data/ride_model.dart';
import 'package:remis_driver/features/history/data/history_repository.dart';

final _historyRepoProvider = Provider<DriverHistoryRepository>(
  (_) => DriverHistoryRepository(Supabase.instance.client),
);

final _todayEarningsProvider = FutureProvider<double>((ref) {
  final uid = Supabase.instance.client.auth.currentUser?.id;
  if (uid == null) return 0;
  return ref.read(_historyRepoProvider).getTodayEarnings(uid);
});

final _monthEarningsProvider = FutureProvider<double>((ref) {
  final uid = Supabase.instance.client.auth.currentUser?.id;
  if (uid == null) return 0;
  return ref.read(_historyRepoProvider).getMonthEarnings(uid);
});

class HistoryScreen extends ConsumerStatefulWidget {
  const HistoryScreen({super.key});

  @override
  ConsumerState<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends ConsumerState<HistoryScreen> {
  final List<RideModel> _rides = [];
  int _page = 0;
  bool _isLoading = false;
  bool _hasMore = true;
  String? _error;
  late final ScrollController _scrollController;

  String get _uid => Supabase.instance.client.auth.currentUser!.id;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController()..addListener(_onScroll);
    _loadMore();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      _loadMore();
    }
  }

  Future<void> _loadMore() async {
    if (_isLoading || !_hasMore) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final newRides = await ref
          .read(_historyRepoProvider)
          .getRideHistory(driverId: _uid, page: _page, pageSize: 20);
      setState(() {
        _rides.addAll(newRides);
        _page++;
        _hasMore = newRides.length == 20;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _error = e.toString();
      });
    }
  }

  Future<void> _refresh() async {
    await HapticFeedback.lightImpact();
    setState(() {
      _rides.clear();
      _page = 0;
      _hasMore = true;
      _error = null;
    });
    ref.invalidate(_todayEarningsProvider);
    ref.invalidate(_monthEarningsProvider);
    await _loadMore();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Historial',
          style: interTight(fontSize: RTextSize.md, fontWeight: FontWeight.w600),
        ),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_error != null && _rides.isEmpty) {
      return _ErrorState(error: _error!, onRetry: _refresh);
    }

    if (_isLoading && _rides.isEmpty) {
      return const _SkeletonList();
    }

    if (!_isLoading && _rides.isEmpty) {
      return const _EmptyHistory();
    }

    final itemCount = _rides.length + (_isLoading || _error != null ? 1 : 0);

    return RefreshIndicator(
      onRefresh: _refresh,
      child: ListView.builder(
        controller: _scrollController,
        padding: const EdgeInsets.all(16),
        itemCount: itemCount + 1,
        itemBuilder: (context, i) {
          if (i == 0) return _EarningsHeader(ref: ref);

          final idx = i - 1;
          if (idx == _rides.length) {
            if (_isLoading) {
              return const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: LinearProgressIndicator(),
              );
            }
            if (_error != null) {
              return _InlineError(error: _error!, onRetry: _loadMore);
            }
          }
          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _AnimatedRideCard(
              index: idx,
              child: _RideCard(ride: _rides[idx]),
            ),
          );
        },
      ),
    );
  }
}

// -- Earnings header --------------------------------------------------------

class _EarningsHeader extends StatelessWidget {
  const _EarningsHeader({required this.ref});
  final WidgetRef ref;

  @override
  Widget build(BuildContext context) {
    final today = ref.watch(_todayEarningsProvider);
    final month = ref.watch(_monthEarningsProvider);
    final theme = Theme.of(context);

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(RSpacing.s16),
      decoration: BoxDecoration(
        color: kBrandPrimary.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(RRadius.lg),
      ),
      child: Row(
        children: [
          Expanded(
            child: _EarningCell(
              label: 'Hoy',
              value: today,
              theme: theme,
            ),
          ),
          Container(
            width: 1,
            height: 40,
            color: kBrandPrimary.withValues(alpha: 0.15),
          ),
          Expanded(
            child: _EarningCell(
              label: 'Este mes',
              value: month,
              theme: theme,
            ),
          ),
        ],
      ),
    );
  }
}

class _EarningCell extends StatelessWidget {
  const _EarningCell({
    required this.label,
    required this.value,
    required this.theme,
  });

  final String label;
  final AsyncValue<double> value;
  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          label,
          style: inter(
            fontSize: RTextSize.xs,
            fontWeight: FontWeight.w500,
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 4),
        value.when(
          data: (v) => Text(
            formatArs(v, showDecimals: false),
            style: interTight(
              fontSize: RTextSize.lg,
              fontWeight: FontWeight.w700,
              color: kBrandPrimary,
            ),
          ),
          loading: () => const SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          error: (_, __) => Text(
            '--',
            style: interTight(
              fontSize: RTextSize.lg,
              fontWeight: FontWeight.w700,
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ),
      ],
    );
  }
}

// -- Animated card -----------------------------------------------------------

class _AnimatedRideCard extends StatefulWidget {
  const _AnimatedRideCard({required this.index, required this.child});
  final int index;
  final Widget child;

  @override
  State<_AnimatedRideCard> createState() => _AnimatedRideCardState();
}

class _AnimatedRideCardState extends State<_AnimatedRideCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _opacity;
  late final Animation<Offset> _slide;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 350),
    );
    _opacity = CurvedAnimation(parent: _ctrl, curve: Curves.easeOut);
    _slide = Tween<Offset>(
      begin: const Offset(0, 0.08),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOutCubic));

    final delay = widget.index.clamp(0, 8) * 60;
    Future.delayed(Duration(milliseconds: delay), () {
      if (mounted) _ctrl.forward();
    });
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _opacity,
      child: SlideTransition(position: _slide, child: widget.child),
    );
  }
}

// -- Ride card ---------------------------------------------------------------

class _RideCard extends StatelessWidget {
  const _RideCard({required this.ride});
  final RideModel ride;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final fare = ride.finalFareArs ?? ride.estimatedFareArs ?? 0;
    final distKm = (ride.distanceMeters ?? 0) / 1000;
    final dateText = _dateLabel(ride.endedAt ?? ride.requestedAt);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  dateText,
                  style: inter(
                    fontSize: RTextSize.xs,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                const Spacer(),
                Text(
                  formatArs(fare, showDecimals: false),
                  style: interTight(
                    fontSize: RTextSize.md,
                    fontWeight: FontWeight.w600,
                    color: theme.colorScheme.onSurface,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            _RouteRow(
              icon: Icons.radio_button_checked,
              color: kBrandPrimary,
              label: ride.pickupAddress,
            ),
            Padding(
              padding: const EdgeInsets.only(left: 10),
              child: SizedBox(
                height: 14,
                child: VerticalDivider(
                  color: theme.colorScheme.outlineVariant,
                  thickness: 1.5,
                  width: 1,
                ),
              ),
            ),
            _RouteRow(
              icon: Icons.location_on,
              color: kBrandAccent,
              label: ride.destAddress,
            ),
            if (distKm > 0) ...[
              const SizedBox(height: 8),
              Text(
                '${distKm.toStringAsFixed(1)} km',
                style: inter(
                  fontSize: RTextSize.xs,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  static String _dateLabel(DateTime dt) {
    return DateFormat('d MMM · HH:mm', 'es').format(dt.toLocal());
  }
}

class _RouteRow extends StatelessWidget {
  const _RouteRow({
    required this.icon,
    required this.color,
    required this.label,
  });

  final IconData icon;
  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            label,
            style: Theme.of(context).textTheme.bodyMedium,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}

// -- Skeleton ----------------------------------------------------------------

class _SkeletonList extends StatelessWidget {
  const _SkeletonList();

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      physics: const NeverScrollableScrollPhysics(),
      itemCount: 5,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, __) => const _SkeletonCard(),
    );
  }
}

class _SkeletonCard extends StatefulWidget {
  const _SkeletonCard();
  @override
  State<_SkeletonCard> createState() => _SkeletonCardState();
}

class _SkeletonCardState extends State<_SkeletonCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _shimmer;

  @override
  void initState() {
    super.initState();
    _shimmer = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _shimmer.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final baseColor = isDark ? kNeutral300Dark : kNeutral200Light;
    final highlightColor = isDark ? kNeutral200Dark : kNeutral100Light;

    return AnimatedBuilder(
      animation: _shimmer,
      builder: (_, __) {
        final color = Color.lerp(baseColor, highlightColor, _shimmer.value)!;
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    _bone(80, 12, color),
                    const Spacer(),
                    _bone(60, 16, color),
                  ],
                ),
                const SizedBox(height: 14),
                _bone(200, 12, color),
                const SizedBox(height: 8),
                _bone(160, 12, color),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _bone(double w, double h, Color color) {
    return Container(
      width: w,
      height: h,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(6),
      ),
    );
  }
}

// -- Empty state -------------------------------------------------------------

class _EmptyHistory extends StatelessWidget {
  const _EmptyHistory();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: kBrandPrimary.withValues(alpha: 0.08),
              ),
              child: Icon(
                Icons.history_rounded,
                size: 40,
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Sin viajes completados',
              style: interTight(
                fontSize: RTextSize.md,
                fontWeight: FontWeight.w600,
                color: theme.colorScheme.onSurface,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Acá vas a ver tu historial de viajes completados.',
              style: inter(
                fontSize: RTextSize.sm,
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

// -- Error states ------------------------------------------------------------

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.error, required this.onRetry});
  final String error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: kDanger.withValues(alpha: 0.12),
              ),
              child: const Icon(Icons.error_outline, size: 36, color: kDanger),
            ),
            const SizedBox(height: 20),
            Text(
              'No se pudo cargar el historial',
              style: interTight(
                fontSize: RTextSize.md,
                fontWeight: FontWeight.w600,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              error,
              style: inter(
                fontSize: RTextSize.xs,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: () {
                HapticFeedback.lightImpact();
                onRetry();
              },
              icon: const Icon(Icons.refresh),
              label: const Text('Reintentar'),
            ),
          ],
        ),
      ),
    );
  }
}

class _InlineError extends StatelessWidget {
  const _InlineError({required this.error, required this.onRetry});
  final String error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.warning_amber_rounded, size: 18, color: kDanger),
          const SizedBox(width: 8),
          Flexible(
            child: Text(
              'Error al cargar más viajes',
              style: inter(
                fontSize: RTextSize.xs,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          const SizedBox(width: 8),
          TextButton(
            onPressed: onRetry,
            style: TextButton.styleFrom(
              minimumSize: const Size(0, 32),
              padding: const EdgeInsets.symmetric(horizontal: 8),
            ),
            child: const Text('Reintentar'),
          ),
        ],
      ),
    );
  }
}
