import 'package:flutter/material.dart';
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
    // Error with no data — full error state with retry
    if (_error != null && _rides.isEmpty) {
      return _ErrorState(error: _error!, onRetry: _refresh);
    }

    // Loading first page
    if (_isLoading && _rides.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    // Empty state
    if (!_isLoading && _rides.isEmpty) {
      return const _EmptyHistory();
    }

    // List with optional footer
    final itemCount = _rides.length + (_isLoading || _error != null ? 1 : 0);

    return RefreshIndicator(
      onRefresh: _refresh,
      child: ListView.separated(
        controller: _scrollController,
        padding: const EdgeInsets.all(16),
        itemCount: itemCount,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (context, i) {
          if (i == _rides.length) {
            // Footer slot: loading indicator or inline error
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
          return _RideCard(
            ride: _rides[i],
            onRepeat: () => context.go('/'),
            onHelp: () => _showHelpDialog(context),
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
    final fareText = _fareLabel(ride);
    final dateText = _dateLabel(ride.requestedAt);
    final chipData = _chipForStatus(ride.status);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top row: date + fare
            Row(
              children: [
                Text(
                  dateText,
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: AppColors.neutral500),
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
            // Route
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
                  color: AppColors.neutral300,
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
            // Status chip + driver info
            Row(
              children: [
                _StatusChip(label: chipData.label, color: chipData.color),
                const SizedBox(width: 8),
                Text(
                  ride.driverId != null ? 'Conductor' : '',
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: AppColors.neutral500),
                ),
              ],
            ),
            const SizedBox(height: 10),
            // Action buttons
            Row(
              children: [
                TextButton.icon(
                  onPressed: onRepeat,
                  icon: const Icon(Icons.replay, size: 16),
                  label: const Text('Volver a pedir'),
                  style: TextButton.styleFrom(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    minimumSize: const Size(0, 36),
                  ),
                ),
                const SizedBox(width: 8),
                TextButton(
                  onPressed: onHelp,
                  style: TextButton.styleFrom(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    minimumSize: const Size(0, 36),
                  ),
                  child: const Text('Ayuda'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  static String _fareLabel(RideModel ride) {
    final amount = ride.finalFareArs ?? ride.estimatedFareArs;
    if (amount == null) return r'$--';
    return formatArs(amount, showDecimals: false);
  }

  static String _dateLabel(DateTime? dt) {
    if (dt == null) return '–';
    return DateFormat("d MMM · HH:mm", 'es').format(dt.toLocal());
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
        Icon(icon, size: 18, color: color),
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
// Status chip
// ---------------------------------------------------------------------------

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final bg = color.withOpacity(0.12);
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
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.history, size: 64, color: AppColors.neutral300),
          const SizedBox(height: 16),
          Text(
            'Todavía no hiciste ningún viaje',
            style: Theme.of(context)
                .textTheme
                .bodyLarge
                ?.copyWith(color: AppColors.neutral500),
          ),
        ],
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
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 48, color: AppColors.danger),
            const SizedBox(height: 16),
            Text(
              'No se pudo cargar el historial',
              style: Theme.of(context).textTheme.bodyLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              error,
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: AppColors.neutral500),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: onRetry,
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
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: AppColors.neutral500),
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
