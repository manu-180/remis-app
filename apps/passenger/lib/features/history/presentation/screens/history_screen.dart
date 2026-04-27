import 'package:flutter/material.dart';
import 'package:remis_flutter_core/flutter_core.dart';

import '../../../../core/theme/app_theme.dart';

class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key});

  static final _mockRides = [
    _MockRide(
      date: DateTime.now().subtract(const Duration(days: 1, hours: 2)),
      origin: 'San Martín 340',
      destination: 'Hospital Lucio Molas',
      amount: 2400,
      status: 'Completado',
    ),
    _MockRide(
      date: DateTime.now().subtract(const Duration(days: 3)),
      origin: 'Mi ubicación',
      destination: 'Terminal de Ómnibus',
      amount: 3200,
      status: 'Completado',
    ),
    _MockRide(
      date: DateTime.now().subtract(const Duration(days: 5)),
      origin: 'Centenario 1234',
      destination: 'Aeropuerto',
      amount: 5800,
      status: 'Cancelado',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Historial'),
        centerTitle: false,
      ),
      body: _mockRides.isEmpty
          ? _EmptyHistory()
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: _mockRides.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, i) => _RideCard(ride: _mockRides[i]),
            ),
    );
  }
}

class _RideCard extends StatelessWidget {
  const _RideCard({required this.ride});

  final _MockRide ride;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isCancelled = ride.status == 'Cancelado';

    return Card(
      child: InkWell(
        onTap: () {},
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    relativeTime(ride.date),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.neutral500,
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: isCancelled
                          ? const Color(0xFFFEF2F2)
                          : const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      ride.status,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: isCancelled
                            ? AppColors.danger
                            : AppColors.success,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              _RouteRow(
                icon: Icons.radio_button_checked,
                color: AppColors.brandPrimary,
                label: ride.origin,
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
                label: ride.destination,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Text(
                    formatArs(ride.amount.toDouble(), showDecimals: false),
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const Spacer(),
                  TextButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.replay, size: 16),
                    label: const Text('Volver a pedir'),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      minimumSize: const Size(0, 36),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
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

class _EmptyHistory extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.history,
            size: 64,
            color: AppColors.neutral300,
          ),
          const SizedBox(height: 16),
          Text(
            'Todavía no hiciste ningún viaje',
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: AppColors.neutral500,
                ),
          ),
        ],
      ),
    );
  }
}

class _MockRide {
  const _MockRide({
    required this.date,
    required this.origin,
    required this.destination,
    required this.amount,
    required this.status,
  });

  final DateTime date;
  final String origin;
  final String destination;
  final int amount;
  final String status;
}
