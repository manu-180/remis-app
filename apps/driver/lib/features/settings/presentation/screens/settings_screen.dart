import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:remis_design_system/remis_design_system.dart';
import 'package:remis_flutter_core/remis_flutter_core.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:remis_driver/core/providers/auth_providers.dart';
import 'package:remis_driver/core/theme/theme_controller.dart';
import 'package:remis_driver/features/settings/data/driver_profile_providers.dart';

const _termsUrl = 'https://remis.com.ar/legal/terminos';
const _privacyUrl = 'https://remis.com.ar/legal/privacidad';

String _initials(String name) {
  final parts = name.trim().split(RegExp(r'\s+'));
  if (parts.length >= 2) {
    return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
  }
  return name.isNotEmpty ? name[0].toUpperCase() : '?';
}

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  String _version = '';

  @override
  void initState() {
    super.initState();
    PackageInfo.fromPlatform().then((info) {
      if (mounted) setState(() => _version = '${info.version}+${info.buildNumber}');
    });
  }

  Future<void> _signOut() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(
          'Cerrar sesión',
          style: interTight(fontWeight: FontWeight.w600, fontSize: RTextSize.lg),
        ),
        content: Text(
          '¿Seguro que querés cerrar sesión?',
          style: inter(fontSize: RTextSize.base),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: kDanger),
            child: const Text('Cerrar sesión'),
          ),
        ],
      ),
    );
    if (confirmed == true && mounted) {
      await ref.read(authRepositoryProvider).signOut();
      if (mounted) context.go('/auth/login');
    }
  }

  Future<void> _openUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeMode = ref.watch(themeControllerProvider);
    final theme = Theme.of(context);
    final user = ref.watch(currentUserProvider);
    final fullName =
        user?.userMetadata?['full_name'] as String? ?? 'Conductor';
    final phone = user?.phone ?? '—';

    final profileAsync = ref.watch(driverProfileProvider);
    final docsAsync = ref.watch(driverDocumentsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Configuración',
          style: interTight(
            fontSize: RTextSize.md,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      body: ListView(
        children: [
          // -- Perfil -----------------------------------------------------
          const _SectionHeader(label: 'Perfil'),
          _SettingsTile(
            leading: CircleAvatar(
              radius: 20,
              backgroundColor: kBrandPrimary.withValues(alpha: 0.12),
              child: Text(
                _initials(fullName),
                style: interTight(
                  fontSize: RTextSize.sm,
                  fontWeight: FontWeight.w700,
                  color: kBrandPrimary,
                ),
              ),
            ),
            title: fullName,
            subtitle: phone,
          ),

          // -- Vehículo --------------------------------------------------
          const _SectionHeader(label: 'Vehículo'),
          profileAsync.when(
            data: (data) {
              final vehicle =
                  data?['vehicles'] as Map<String, dynamic>?;
              final mobileNumber =
                  vehicle?['mobile_number'] as String? ??
                      data?['mobile_number'] as String? ??
                      '—';
              final plate = vehicle?['plate'] as String? ?? '—';
              return Column(
                children: [
                  _SettingsTile(
                    leading: const Icon(Icons.directions_car_outlined),
                    title: 'Móvil interno',
                    subtitle: mobileNumber,
                  ),
                  _SettingsTile(
                    leading: const Icon(Icons.pin_outlined),
                    title: 'Patente',
                    subtitle: plate,
                  ),
                ],
              );
            },
            loading: () => const _ShimmerTile(),
            error: (_, __) => const _SettingsTile(
              leading: Icon(Icons.error_outline),
              title: 'Error cargando vehículo',
              subtitle: 'Intentá de nuevo más tarde',
            ),
          ),

          // -- Documentos ------------------------------------------------
          const _SectionHeader(label: 'Documentos'),
          docsAsync.when(
            data: (docs) => _DocumentsList(docs: docs),
            loading: () => const _ShimmerTile(),
            error: (_, __) => const _SettingsTile(
              leading: Icon(Icons.error_outline),
              title: 'Error cargando documentos',
              subtitle: 'Intentá de nuevo más tarde',
            ),
          ),

          // -- App -------------------------------------------------------
          const _SectionHeader(label: 'App'),
          ListTile(
            leading: Icon(
              Icons.palette_outlined,
              color: theme.colorScheme.onSurfaceVariant,
            ),
            title: Text('Tema', style: inter(fontSize: RTextSize.base)),
            trailing: SegmentedButton<ThemeMode>(
              segments: const [
                ButtonSegment(value: ThemeMode.light, icon: Icon(Icons.light_mode, size: 16)),
                ButtonSegment(value: ThemeMode.system, icon: Icon(Icons.brightness_auto, size: 16)),
                ButtonSegment(value: ThemeMode.dark, icon: Icon(Icons.dark_mode, size: 16)),
              ],
              selected: {themeMode},
              onSelectionChanged: (s) {
                ref.read(themeControllerProvider.notifier).setTheme(s.first);
              },
              style: const ButtonStyle(
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
            ),
          ),
          _SettingsTile(
            leading: const Icon(Icons.history_rounded),
            title: 'Historial de viajes',
            onTap: () => context.push('/history'),
          ),

          // -- Sobre -----------------------------------------------------
          const _SectionHeader(label: 'Sobre'),
          _SettingsTile(
            leading: const Icon(Icons.info_outline),
            title: 'Versión',
            subtitle: _version.isNotEmpty ? _version : '…',
            onTap: null,
          ),
          _SettingsTile(
            leading: const Icon(Icons.gavel_outlined),
            title: 'Términos y condiciones',
            onTap: () => _openUrl(_termsUrl),
          ),
          _SettingsTile(
            leading: const Icon(Icons.privacy_tip_outlined),
            title: 'Política de privacidad',
            onTap: () => _openUrl(_privacyUrl),
          ),

          const SizedBox(height: RSpacing.s24),

          // -- Cerrar sesión ---------------------------------------------
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: RSpacing.s20),
            child: OutlinedButton(
              onPressed: _signOut,
              style: OutlinedButton.styleFrom(
                foregroundColor: kDanger,
                side: const BorderSide(color: kDanger),
                minimumSize: const Size(double.infinity, 48),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(RRadius.md),
                ),
              ),
              child: Text(
                'Cerrar sesión',
                style: inter(
                  fontSize: RTextSize.base,
                  fontWeight: FontWeight.w500,
                  color: kDanger,
                ),
              ),
            ),
          ),
          const SizedBox(height: RSpacing.s32),
        ],
      ),
    );
  }
}

// -- Documents list ----------------------------------------------------------

class _DocumentsList extends StatelessWidget {
  const _DocumentsList({required this.docs});
  final List<Map<String, dynamic>> docs;

  static const _docLabels = <String, (String, IconData)>{
    'luc_d1': ('LUC D1', Icons.description_outlined),
    'vtv': ('VTV', Icons.verified_outlined),
    'insurance_rc': ('Seguro RC', Icons.security_outlined),
    'insurance_passengers': ('Seguro pasajeros', Icons.shield_outlined),
    'health_card': ('Carnet sanitario', Icons.medical_services_outlined),
    'vehicle_authorization': ('Habilitación', Icons.fact_check_outlined),
    'criminal_record': ('Antecedentes', Icons.gavel_outlined),
  };

  @override
  Widget build(BuildContext context) {
    if (docs.isEmpty) {
      return const _SettingsTile(
        leading: Icon(Icons.description_outlined),
        title: 'Sin documentos cargados',
      );
    }

    return Column(
      children: docs.map((doc) {
        final type = doc['document_type'] as String;
        final expiresStr = doc['expires_at'] as String?;
        final info = _docLabels[type] ?? (type, Icons.description_outlined);
        final label = info.$1;
        final icon = info.$2;

        String subtitleText = 'Sin vencimiento';
        Color? subtitleColor;

        if (expiresStr != null) {
          final expiresAt = DateTime.parse(expiresStr);
          final daysLeft = expiresAt.difference(DateTime.now()).inDays;
          final formatted = DateFormat('dd/MM/yyyy').format(expiresAt);

          if (daysLeft < 0) {
            subtitleText = 'Vencido: $formatted';
            subtitleColor = kDanger;
          } else if (daysLeft < 30) {
            subtitleText = 'Vence: $formatted';
            subtitleColor = kWarning;
          } else {
            subtitleText = 'Vence: $formatted';
          }
        }

        return _SettingsTile(
          leading: Icon(icon),
          title: label,
          subtitle: subtitleText,
          subtitleColor: subtitleColor,
        );
      }).toList(),
    );
  }
}

// -- Helpers -----------------------------------------------------------------

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(RSpacing.s20, RSpacing.s24, RSpacing.s20, RSpacing.s8),
      child: Text(
        label.toUpperCase(),
        style: inter(
          fontSize: RTextSize.xs,
          fontWeight: FontWeight.w600,
          color: Theme.of(context).colorScheme.onSurfaceVariant,
          letterSpacing: 0.06 * RTextSize.xs,
        ),
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  const _SettingsTile({
    required this.leading,
    required this.title,
    this.subtitle,
    this.subtitleColor,
    this.onTap,
  });

  final Widget leading;
  final String title;
  final String? subtitle;
  final Color? subtitleColor;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListTile(
      leading: IconTheme(
        data: IconThemeData(color: theme.colorScheme.onSurfaceVariant, size: 22),
        child: leading,
      ),
      title: Text(title, style: inter(fontSize: RTextSize.base)),
      subtitle: subtitle != null
          ? Text(
              subtitle!,
              style: inter(
                fontSize: RTextSize.sm,
                color: subtitleColor ?? theme.colorScheme.onSurfaceVariant,
              ),
            )
          : null,
      trailing: onTap != null
          ? Icon(Icons.chevron_right, color: theme.colorScheme.outlineVariant)
          : null,
      onTap: onTap,
    );
  }
}

class _ShimmerTile extends StatelessWidget {
  const _ShimmerTile();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(horizontal: RSpacing.s20, vertical: RSpacing.s12),
      child: Row(
        children: [
          SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          SizedBox(width: 16),
          Text('Cargando…'),
        ],
      ),
    );
  }
}
