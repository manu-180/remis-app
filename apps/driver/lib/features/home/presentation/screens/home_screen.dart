import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:remis_design_system/remis_design_system.dart';
import 'package:remis_driver/shared/widgets/driver_status_pill.dart';

// La Pampa centro como posición inicial
const _initialPosition = CameraPosition(
  target: LatLng(-36.6167, -64.2833),
  zoom: 13,
);

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  DriverStatus _status = DriverStatus.offline;

  void _toggleTurn() {
    HapticFeedback.lightImpact();
    setState(() {
      _status = _status == DriverStatus.offline
          ? DriverStatus.available
          : DriverStatus.offline;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isActive = _status != DriverStatus.offline;
    final theme = Theme.of(context);

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: theme.brightness == Brightness.dark
            ? Brightness.light
            : Brightness.dark,
        systemNavigationBarColor: Colors.transparent,
      ),
      child: Scaffold(
        extendBodyBehindAppBar: true,
        appBar: _TranslucentAppBar(status: _status),
        body: Stack(
          children: [
            // Mapa fullscreen
            const GoogleMap(
              initialCameraPosition: _initialPosition,
              myLocationEnabled: false, // Tanda 3 conecta GPS real
              myLocationButtonEnabled: false,
              zoomControlsEnabled: false,
              mapToolbarEnabled: false,
              compassEnabled: false,
            ),
            // Bottom status card
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: _DriverBottomCard(
                status: _status,
                isActive: isActive,
                onToggle: _toggleTurn,
              ),
            ),
          ],
        ),
        // FAB: centrar ubicación
        floatingActionButton: Padding(
          padding: const EdgeInsets.only(bottom: 140),
          child: FloatingActionButton.small(
            onPressed: () {},
            backgroundColor: theme.colorScheme.surface,
            foregroundColor: theme.colorScheme.onSurface,
            elevation: 2,
            child: const Icon(Icons.my_location),
          ),
        ),
        floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      ),
    );
  }
}

class _TranslucentAppBar extends StatelessWidget implements PreferredSizeWidget {
  const _TranslucentAppBar({required this.status});

  final DriverStatus status;

  @override
  Size get preferredSize => const Size.fromHeight(56);

  @override
  Widget build(BuildContext context) {
    return ClipRect(
      child: BackdropFilter(
        filter: ColorFilter.mode(
          Theme.of(context).colorScheme.surface.withValues(alpha: 0.72),
          BlendMode.srcATop,
        ),
        child: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.menu),
            onPressed: () => context.push('/settings'),
          ),
          title: Text(
            status == DriverStatus.offline ? 'Turno inactivo' : 'Turno activo',
            style: interTight(
              fontSize: RTextSize.md,
              fontWeight: FontWeight.w600,
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
          actions: [
            // SOS placeholder
            IconButton(
              onPressed: () {},
              icon: const Icon(Icons.warning_amber_rounded),
              color: kDanger,
              tooltip: 'SOS',
            ),
          ],
        ),
      ),
    );
  }
}

class _DriverBottomCard extends StatelessWidget {
  const _DriverBottomCard({
    required this.status,
    required this.isActive,
    required this.onToggle,
  });

  final DriverStatus status;
  final bool isActive;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: EdgeInsets.fromLTRB(
        RSpacing.s20,
        RSpacing.s16,
        RSpacing.s20,
        RSpacing.s20 + MediaQuery.paddingOf(context).bottom,
      ),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(RRadius.xl),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 15,
            offset: const Offset(0, -3),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 44,
              height: 4,
              margin: const EdgeInsets.only(bottom: RSpacing.s12),
              decoration: BoxDecoration(
                color: theme.colorScheme.outlineVariant,
                borderRadius: BorderRadius.circular(RRadius.full),
              ),
            ),
          ),
          DriverStatusPill(status: status),
          const SizedBox(height: RSpacing.s4),
          Text(
            isActive ? 'En zona · 0 pedidos pendientes' : 'Iniciá tu turno para recibir pedidos',
            style: inter(
              fontSize: RTextSize.xs,
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: RSpacing.s16),
          SizedBox(
            width: double.infinity,
            height: 64,
            child: FilledButton(
              onPressed: onToggle,
              style: FilledButton.styleFrom(
                backgroundColor: isActive ? kNeutral200Light : kBrandAccent,
                foregroundColor: isActive ? kNeutral900Light : Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(RRadius.md),
                ),
                textStyle: inter(
                  fontSize: RTextSize.base,
                  fontWeight: FontWeight.w600,
                ),
              ),
              child: Text(isActive ? 'Pausar turno' : 'Iniciar turno'),
            ),
          ),
        ],
      ),
    );
  }
}
