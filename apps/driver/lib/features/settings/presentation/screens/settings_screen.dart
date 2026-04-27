import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:remis_design_system/remis_design_system.dart';
import 'package:remis_flutter_core/remis_flutter_core.dart';
import 'package:remis_driver/core/theme/theme_controller.dart';

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

  @override
  Widget build(BuildContext context) {
    final themeMode = ref.watch(themeControllerProvider);
    final theme = Theme.of(context);

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
          // ─── Perfil ────────────────────────────────────────────────────
          const _SectionHeader(label: 'Perfil'),
          const _SettingsTile(
            leading: CircleAvatar(radius: 20, child: Icon(Icons.person)),
            title: 'Nombre del conductor',
            subtitle: 'Teléfono registrado',
          ),

          // ─── Vehículo ──────────────────────────────────────────────────
          const _SectionHeader(label: 'Vehículo'),
          const _SettingsTile(
            leading: Icon(Icons.directions_car_outlined),
            title: 'Móvil interno',
            subtitle: '—',
          ),
          const _SettingsTile(
            leading: Icon(Icons.pin_outlined),
            title: 'Patente',
            subtitle: '—',
          ),

          // ─── Documentos ────────────────────────────────────────────────
          const _SectionHeader(label: 'Documentos'),
          const _SettingsTile(
            leading: Icon(Icons.description_outlined),
            title: 'LUC D1',
            subtitle: 'Vencimiento: —',
          ),
          const _SettingsTile(
            leading: Icon(Icons.verified_outlined),
            title: 'VTV',
            subtitle: 'Vencimiento: —',
          ),
          const _SettingsTile(
            leading: Icon(Icons.security_outlined),
            title: 'Seguro',
            subtitle: 'Vencimiento: —',
          ),

          // ─── App ───────────────────────────────────────────────────────
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
          const _SettingsTile(
            leading: Icon(Icons.notifications_outlined),
            title: 'Notificaciones',
            subtitle: 'Tanda 3',
          ),

          // ─── Sobre ─────────────────────────────────────────────────────
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
            onTap: () {},
          ),
          _SettingsTile(
            leading: const Icon(Icons.privacy_tip_outlined),
            title: 'Política de privacidad',
            onTap: () {},
          ),

          const SizedBox(height: RSpacing.s24),

          // ─── Cerrar sesión ─────────────────────────────────────────────
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
    this.onTap,
  });

  final Widget leading;
  final String title;
  final String? subtitle;
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
          ? Text(subtitle!, style: inter(fontSize: RTextSize.sm, color: theme.colorScheme.onSurfaceVariant))
          : null,
      trailing: onTap != null
          ? Icon(Icons.chevron_right, color: theme.colorScheme.outlineVariant)
          : null,
      onTap: onTap,
    );
  }
}
