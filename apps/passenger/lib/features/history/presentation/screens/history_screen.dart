import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:remis_flutter_core/flutter_core.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../ride_request/data/models/ride_model.dart';
import '../../../ride_request/data/ride_repository.dart';

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
          .read(rideRepositoryProvider)
          .getRideHistory(page: _page, pageSize: 20);
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
    HapticFeedback.lightImpact();
    setState(() {
      _rides.clear();
      _page = 0;
      _hasMore = true;
      _error = null;
    });
    await _loadMore();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Historial'),
        centerTitle: false,
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
      child: ListView.separated(
        controller: _scrollController,
        padding: const EdgeInsets.all(16),
        itemCount: itemCount,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, i) {
          if (i == _rides.length) {
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
          return _AnimatedRideCard(
            index: i,
            child: _RideCard(
              ride: _rides[i],
              onRepeat: () => context.go('/'),
              onHelp: () => _showHelpDialog(context),
            ),
          );
        },
      ),
    );
  }

  void _showHelpDialog(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Ayuda'),
        content: const Text(
          'Contactá al despachante al [número de contacto]',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cerrar'),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Animated card wrapper — staggered fade+slide on first appearance
// ---------------------------------------------------------------------------

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

    final delay = (widget.index.clamp(0, 8) * 60);
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

// ---------------------------------------------------------------------------
// Skeleton list — shown while first page loads
// ---------------------------------------------------------------------------

class _SkeletonList extends StatelessWidget {
  const _SkeletonList();

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      physics: const NeverScrollableScrollPhysics(),
      itemCount: 5,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, __) => const _RideCardSkeleton(),
    );
  }
}

class _RideCardSkeleton extends StatefulWidget {
  const _RideCardSkeleton();

  @override
  State<_RideCardSkeleton> createState() => _RideCardSkeletonState();
}

class _RideCardSkeletonState extends State<_RideCardSkeleton>
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
    final baseColor =
        isDark ? AppColors.neutralD300 : AppColors.neutral200;
    final highlightColor =
        isDark ? AppColors.neutralD200 : AppColors.neutral100;

    return AnimatedBuilder(
      animation: _shimmer,
      builder: (_, __) {
        final color =
            Color.lerp(baseColor, highlightColor, _shimmer.value)!;
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
                const SizedBox(height: 14),
                Row(
                  children: [
                    _bone(70, 22, color, radius: 4),
                    const SizedBox(width: 8),
                    _bone(50, 12, color),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _bone(double w, double h, Color color, {double radius = 6}) {
    return Container(
      width: w,
      height: h,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(radius),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Ride card
// ---------------------------------------------------------------------------

class _RideCard extends StatelessWidget {
  const _RideCard({
    required this.ride,
    required this.onRepeat,
    required this.onHelp,
  });

  final RideModel ride;
  final VoidCallback onRepeat;
  final VoidCallback onHelp;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final subtleColor =
        isDark ? AppColors.neutralD500 : AppColors.neutral500;
    final fareText = _fareLabel(ride);
    final dateText = _dateLabel(ride.requestedAt);
    final chipData = _chipForStatus(ride.status);

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () {
          HapticFeedback.selectionClick();
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    dateText,
                    style: theme.textTheme.bodySmall
                        ?.copyWith(color: subtleColor),
                  ),
                  const Spacer(),
                  Text(
                    fareText,
                    style: theme.textTheme.titleMedium
                        ?.copyWith(fontWeight: FontWeight.w600),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              _RouteRow(
                icon: Icons.radio_button_checked,
                color: AppColors.brandPrimary,
                label: ride.pickupAddress ?? 'Origen desconocido',
              ),
              Padding(
                padding: const EdgeInsets.only(left: 10),
                child: SizedBox(
                  height: 14,
                  child: VerticalDivider(
                    color: isDark
                        ? AppColors.neutralD300
                        : AppColors.neutral300,
                    thickness: 1.5,
                    width: 1,
                  ),
                ),
              ),
              _RouteRow(
                icon: Icons.location_on,
                color: AppColors.brandAccent,
                label: ride.destAddress ?? 'Destino desconocido',
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  _StatusChip(label: chipData.label, color: chipData.color),
                  const SizedBox(width: 8),
                  if (ride.driverId != null)
                    Text(
                      'Conductor',
                      style: theme.textTheme.bodySmall
                          ?.copyWith(color: subtleColor),
                    ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  TextButton.icon(
                    onPressed: () {
                      HapticFeedback.lightImpact();
                      onRepeat();
                    },
                    icon: const Icon(Icons.replay, size: 16),
                    label: const Text('Volver a pedir'),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      minimumSize: const Size(0, 36),
                    ),
                  ),
                  const SizedBox(width: 8),
                  TextButton(
                    onPressed: onHelp,
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      minimumSize: const Size(0, 36),
                    ),
                    child: const Text('Ayuda'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  static String _fareLabel(RideModel ride) {
    final amount = ride.finalFareArs ?? ride.estimatedFareArs;
    if (amount == null) return r'$ —';
    return formatArs(amount, showDecimals: false);
  }

  static String _dateLabel(DateTime? dt) {
    if (dt == null) return '–';
    return DateFormat('d MMM · HH:mm', 'es').format(dt.toLocal());
  }

  static ({String label, Color color}) _chipForStatus(RideStatus status) {
    return switch (status) {
      RideStatus.completed => (label: 'Completado', color: AppColors.success),
      RideStatus.cancelledByPassenger ||
      RideStatus.cancelledByDriver ||
      RideStatus.cancelledByDispatcher =>
        (label: 'Cancelado', color: AppColors.danger),
      RideStatus.noShow => (label: 'No show', color: AppColors.danger),
      _ => (label: status.name, color: AppColors.neutral500),
    };
  }
}

// ---------------------------------------------------------------------------
// Route row
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Status chip — dark mode aware
// ---------------------------------------------------------------------------

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = color.withValues(alpha: isDark ? 0.2 : 0.12);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: color,
              fontWeight: FontWeight.w500,
            ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

class _EmptyHistory extends StatelessWidget {
  const _EmptyHistory();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
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
                color: isDark
                    ? AppColors.neutralD200
                    : AppColors.neutral100,
              ),
              child: Icon(
                Icons.history_rounded,
                size: 40,
                color: isDark
                    ? AppColors.neutralD500
                    : AppColors.neutral400,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Todavía no hiciste ningún viaje',
              style: theme.textTheme.titleMedium?.copyWith(
                color: isDark
                    ? AppColors.neutralD800
                    : AppColors.neutral800,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Acá vas a ver tu historial de viajes.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: isDark
                    ? AppColors.neutralD500
                    : AppColors.neutral500,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Full-page error state
// ---------------------------------------------------------------------------

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.error, required this.onRetry});

  final String error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
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
                color: AppColors.danger.withValues(alpha: 0.12),
              ),
              child: Icon(Icons.error_outline, size: 36,
                  color: AppColors.danger),
            ),
            const SizedBox(height: 20),
            Text(
              'No se pudo cargar el historial',
              style: theme.textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              error,
              style: theme.textTheme.bodySmall?.copyWith(
                color: isDark
                    ? AppColors.neutralD500
                    : AppColors.neutral500,
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

// ---------------------------------------------------------------------------
// Inline error footer (when list already has items)
// ---------------------------------------------------------------------------

class _InlineError extends StatelessWidget {
  const _InlineError({required this.error, required this.onRetry});

  final String error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.warning_amber_rounded,
              size: 18, color: AppColors.danger),
          const SizedBox(width: 8),
          Flexible(
            child: Text(
              'Error al cargar más viajes',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: isDark
                        ? AppColors.neutralD500
                        : AppColors.neutral500,
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
