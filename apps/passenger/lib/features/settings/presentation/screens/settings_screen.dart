import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/mock_auth.dart';
import '../../../../core/routing/app_router.dart';
import '../../../../core/theme/app_theme.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Configuración'),
        centerTitle: false,
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 8),
        children: [
          _SectionHeader(label: 'Cuenta'),
          _SettingsTile(
            icon: Icons.person_outline,
            title: 'Mi perfil',
            onTap: () {},
          ),

          _SectionHeader(label: 'Pagos'),
          _SettingsTile(
            icon: Icons.credit_card_outlined,
            title: 'Métodos de pago',
            subtitle: 'Próximamente (Tanda 4D)',
            trailing: _ComingSoonBadge(),
            onTap: null,
          ),

          _SectionHeader(label: 'Seguridad'),
          _SettingsTile(
            icon: Icons.people_outline,
            title: 'Contactos de emergencia',
            subtitle: 'Próximamente (Tanda 5D)',
            trailing: _ComingSoonBadge(),
            onTap: null,
          ),

          _SectionHeader(label: 'Preferencias'),
          _SettingsTile(
            icon: Icons.language,
            title: 'Idioma',
            subtitle: 'Español',
            onTap: null,
          ),

          _SectionHeader(label: 'Información'),
          _SettingsTile(
            icon: Icons.info_outline,
            title: 'Sobre Remís',
            onTap: () => _showAbout(context),
          ),
          _SettingsTile(
            icon: Icons.description_outlined,
            title: 'Términos y Condiciones',
            onTap: () {},
          ),
          _SettingsTile(
            icon: Icons.privacy_tip_outlined,
            title: 'Política de Privacidad',
            onTap: () {},
          ),

          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: OutlinedButton.icon(
              icon: const Icon(Icons.logout, color: AppColors.danger),
              label: const Text(
                'Cerrar sesión',
                style: TextStyle(color: AppColors.danger),
              ),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppColors.danger),
                minimumSize: const Size.fromHeight(48),
              ),
              onPressed: () async {
                final client = ref.read(supabaseClientProvider);
                await signOut(client);
                if (context.mounted) context.go(AppRoutes.login);
              },
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  void _showAbout(BuildContext context) {
    showAboutDialog(
      context: context,
      applicationName: 'Remís',
      applicationVersion: '1.0.0',
      applicationLegalese: '© 2026 Remís. Todos los derechos reservados.',
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 4),
      child: Text(
        label.toUpperCase(),
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: AppColors.neutral500,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.06 * 12,
            ),
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  const _SettingsTile({
    required this.icon,
    required this.title,
    this.subtitle,
    this.trailing,
    this.onTap,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, size: 22),
      title: Text(title, style: Theme.of(context).textTheme.bodyLarge),
      subtitle: subtitle != null
          ? Text(
              subtitle!,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.neutral400,
                  ),
            )
          : null,
      trailing: trailing ??
          (onTap != null
              ? const Icon(Icons.chevron_right, size: 20)
              : null),
      onTap: onTap,
      minLeadingWidth: 24,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
    );
  }
}

class _ComingSoonBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        'Próximamente',
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: AppColors.info,
              fontWeight: FontWeight.w500,
            ),
      ),
    );
  }
}
