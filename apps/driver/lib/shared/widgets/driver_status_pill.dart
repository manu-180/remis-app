import 'package:flutter/material.dart';
import 'package:remis_design_system/remis_design_system.dart';

enum DriverStatus { offline, available, onBreak, enRoute, waiting, onTrip, suspended }

extension DriverStatusX on DriverStatus {
  String get label => switch (this) {
        DriverStatus.offline => 'Offline',
        DriverStatus.available => 'Disponible',
        DriverStatus.onBreak => 'En descanso',
        DriverStatus.enRoute => 'Yendo al pickup',
        DriverStatus.waiting => 'Esperando pasajero',
        DriverStatus.onTrip => 'En viaje',
        DriverStatus.suspended => 'Suspendido',
      };

  Color get color => switch (this) {
        DriverStatus.offline => kDriverOffline,
        DriverStatus.available => kDriverAvailable,
        DriverStatus.onBreak => kDriverOnBreak,
        DriverStatus.enRoute => kDriverEnRoute,
        DriverStatus.waiting => kDriverWaiting,
        DriverStatus.onTrip => kDriverOnTrip,
        DriverStatus.suspended => kDriverSuspended,
      };
}

class DriverStatusPill extends StatelessWidget {
  const DriverStatusPill({super.key, required this.status});

  final DriverStatus status;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: status.color,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: RSpacing.s6),
        Text(
          status.label,
          style: inter(
            fontSize: RTextSize.sm,
            fontWeight: FontWeight.w500,
            color: Theme.of(context).colorScheme.onSurface,
          ),
        ),
      ],
    );
  }
}
