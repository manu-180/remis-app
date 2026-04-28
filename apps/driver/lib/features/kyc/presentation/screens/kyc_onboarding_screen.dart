import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:remis_design_system/remis_design_system.dart';
import 'package:remis_driver/features/kyc/presentation/providers/kyc_controller.dart';

class KycOnboardingScreen extends ConsumerStatefulWidget {
  const KycOnboardingScreen({super.key});

  @override
  ConsumerState<KycOnboardingScreen> createState() => _KycOnboardingScreenState();
}

class _KycOnboardingScreenState extends ConsumerState<KycOnboardingScreen> {
  bool _urlOpened = false;

  Future<void> _openUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (mounted) {
        setState(() => _urlOpened = true);
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('No se pudo abrir el enlace de verificación.'),
            backgroundColor: kDanger,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final kycState = ref.watch(kycControllerProvider);

    ref.listen(kycControllerProvider, (_, next) {
      if (next is KycSessionCreated) {
        _openUrl(next.sessionUrl);
      } else if (next is KycFailure) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.message),
            backgroundColor: kDanger,
            behavior: SnackBarBehavior.floating,
          ),
        );
        ref.read(kycControllerProvider.notifier).reset();
      } else if (next is KycSuccess) {
        context.go('/home');
      }
    });

    final isLoading = kycState is KycLoading;
    final sessionCreated = kycState is KycSessionCreated;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: RSpacing.s24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: RSpacing.s12),
              IconButton(
                onPressed: () => context.canPop() ? context.pop() : null,
                icon: const Icon(Icons.arrow_back),
                padding: EdgeInsets.zero,
              ),
              const SizedBox(height: RSpacing.s40),
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: kBrandPrimary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(RRadius.md),
                ),
                child: const Icon(
                  Icons.verified_user_outlined,
                  color: kBrandPrimary,
                  size: 28,
                ),
              ),
              const SizedBox(height: RSpacing.s24),
              Text(
                'Verificación de identidad',
                style: interTight(
                  fontSize: RTextSize.xl3,
                  fontWeight: FontWeight.w700,
                  color: Theme.of(context).colorScheme.onSurface,
                  letterSpacing: -0.02 * RTextSize.xl3,
                  height: 1.05,
                ),
              ),
              const SizedBox(height: RSpacing.s12),
              Text(
                'Para operar como conductor necesitamos verificar tu identidad. '
                'El proceso es rápido: vas a necesitar tu DNI y una selfie.',
                style: inter(
                  fontSize: RTextSize.md,
                  fontWeight: FontWeight.w400,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: RSpacing.s32),
              _StepItem(
                number: '1',
                label: 'Fotográfiá el frente de tu DNI',
              ),
              const SizedBox(height: RSpacing.s16),
              _StepItem(
                number: '2',
                label: 'Fotográfiá el dorso de tu DNI',
              ),
              const SizedBox(height: RSpacing.s16),
              _StepItem(
                number: '3',
                label: 'Tomá una selfie mirando a la cámara',
              ),
              if (_urlOpened || sessionCreated) ...[
                const SizedBox(height: RSpacing.s32),
                Container(
                  padding: const EdgeInsets.all(RSpacing.s16),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(RRadius.md),
                  ),
                  child: Row(
                    children: [
                      if (isLoading)
                        const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      else
                        Icon(
                          Icons.info_outline,
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                          size: 20,
                        ),
                      const SizedBox(width: RSpacing.s12),
                      Expanded(
                        child: Text(
                          isLoading
                              ? 'Verificando tu identidad...'
                              : 'Completá la verificación en el navegador y luego volvé aquí.',
                          style: inter(
                            fontSize: RTextSize.sm,
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const Spacer(),
              if (!_urlOpened && !sessionCreated)
                FilledButton(
                  onPressed: isLoading
                      ? null
                      : () => ref.read(kycControllerProvider.notifier).createSession(),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(double.infinity, 48),
                    backgroundColor: kBrandPrimary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(RRadius.md),
                    ),
                    textStyle: inter(
                      fontSize: RTextSize.base,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  child: isLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text('Comenzar verificación'),
                )
              else ...[
                FilledButton(
                  onPressed: isLoading
                      ? null
                      : () => ref.read(kycControllerProvider.notifier).checkStatus(),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(double.infinity, 48),
                    backgroundColor: kBrandPrimary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(RRadius.md),
                    ),
                    textStyle: inter(
                      fontSize: RTextSize.base,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  child: isLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text('Ya completé la verificación'),
                ),
                const SizedBox(height: RSpacing.s12),
                if (sessionCreated)
                  SizedBox(
                    width: double.infinity,
                    child: TextButton(
                      onPressed: () => _openUrl((kycState as KycSessionCreated).sessionUrl),
                      child: Text(
                        'Abrir verificación de nuevo',
                        style: inter(
                          fontSize: RTextSize.sm,
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ),
                  ),
              ],
              const SizedBox(height: RSpacing.s24),
            ],
          ),
        ),
      ),
    );
  }
}

class _StepItem extends StatelessWidget {
  const _StepItem({required this.number, required this.label});

  final String number;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 28,
          height: 28,
          decoration: const BoxDecoration(
            color: kBrandPrimary,
            shape: BoxShape.circle,
          ),
          alignment: Alignment.center,
          child: Text(
            number,
            style: inter(
              fontSize: RTextSize.sm,
              fontWeight: FontWeight.w600,
              color: Colors.white,
            ),
          ),
        ),
        const SizedBox(width: RSpacing.s12),
        Expanded(
          child: Text(
            label,
            style: inter(
              fontSize: RTextSize.base,
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
        ),
      ],
    );
  }
}
