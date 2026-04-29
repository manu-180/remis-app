import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:remis_design_system/remis_design_system.dart';
import 'package:remis_driver/features/kyc/presentation/providers/kyc_controller.dart';

class KycOnboardingScreen extends ConsumerWidget {
  const KycOnboardingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final kycState = ref.watch(kycControllerProvider);

    ref.listen(kycControllerProvider, (_, next) {
      if (next is KycFailure) {
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
    final isPending = kycState is KycPending;

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
                'Un administrador revisará tu solicitud y te habilitará.',
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
                label: 'Solicitá la verificación con el botón de abajo',
              ),
              const SizedBox(height: RSpacing.s16),
              _StepItem(
                number: '2',
                label: 'Un administrador revisará tu solicitud',
              ),
              const SizedBox(height: RSpacing.s16),
              _StepItem(
                number: '3',
                label: 'Una vez aprobado, podés empezar a trabajar',
              ),
              if (isPending) ...[
                const SizedBox(height: RSpacing.s32),
                Container(
                  padding: const EdgeInsets.all(RSpacing.s16),
                  decoration: BoxDecoration(
                    color: kBrandPrimary.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(RRadius.md),
                    border: Border.all(
                      color: kBrandPrimary.withOpacity(0.2),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.check_circle_outline,
                        color: kBrandPrimary,
                        size: 20,
                      ),
                      const SizedBox(width: RSpacing.s12),
                      Expanded(
                        child: Text(
                          'Solicitud enviada. Un administrador la revisará pronto.',
                          style: inter(
                            fontSize: RTextSize.sm,
                            color: kBrandPrimary,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const Spacer(),
              if (!isPending)
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
                      : const Text('Enviar solicitud de verificación'),
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
                      : const Text('Ya fui aprobado'),
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
