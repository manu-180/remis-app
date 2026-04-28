import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:remis_design_system/remis_design_system.dart';
import 'package:remis_driver/features/kyc/presentation/providers/intra_shift_kyc_controller.dart';

class IntraShiftVerificationScreen extends ConsumerStatefulWidget {
  const IntraShiftVerificationScreen({
    super.key,
    required this.isPreShift,
  });

  final bool isPreShift;

  @override
  ConsumerState<IntraShiftVerificationScreen> createState() =>
      _IntraShiftVerificationScreenState();
}

class _IntraShiftVerificationScreenState
    extends ConsumerState<IntraShiftVerificationScreen> {
  String get _uid => Supabase.instance.client.auth.currentUser!.id;

  @override
  Widget build(BuildContext context) {
    final kycState = ref.watch(intraShiftKycControllerProvider);

    final isIdle = kycState is IntraShiftKycIdle;
    final isCapturing = kycState is IntraShiftKycCapturing;
    final isUploading = kycState is IntraShiftKycUploading;
    final isPassed = kycState is IntraShiftKycPassed;
    final isFailed = kycState is IntraShiftKycFailed;
    final isProcessing = isCapturing || isUploading;

    final title = widget.isPreShift
        ? 'Verificación pre-turno'
        : 'Verificación de identidad';

    String statusText;
    if (isCapturing) {
      statusText = 'Capturando...';
    } else if (isUploading) {
      statusText = 'Verificando...';
    } else if (isPassed) {
      statusText = '¡Todo bien! Podés comenzar';
    } else if (isFailed) {
      statusText = 'No coincide con tu foto registrada';
    } else if (kycState is IntraShiftKycError) {
      statusText = kycState.message;
    } else {
      statusText = 'Mirá al frente y mantenete quieto';
    }

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: RSpacing.s24),
          child: Column(
            children: [
              const SizedBox(height: RSpacing.s12),
              Row(
                children: [
                  if (!widget.isPreShift || isPassed)
                    IconButton(
                      onPressed: () => context.canPop() ? context.pop() : null,
                      icon: const Icon(Icons.close),
                      padding: EdgeInsets.zero,
                    )
                  else
                    const SizedBox(width: 40),
                  const Spacer(),
                  Text(
                    title,
                    style: inter(
                      fontSize: RTextSize.base,
                      fontWeight: FontWeight.w600,
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                  ),
                  const Spacer(),
                  const SizedBox(width: 40),
                ],
              ),
              const SizedBox(height: RSpacing.s40),
              Expanded(
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (isPassed) ...[
                        Container(
                          width: 100,
                          height: 100,
                          decoration: BoxDecoration(
                            color: kSuccess.withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.check_circle_rounded,
                            color: kSuccess,
                            size: 56,
                          ),
                        ),
                      ] else if (isFailed) ...[
                        Container(
                          width: 100,
                          height: 100,
                          decoration: BoxDecoration(
                            color: kDanger.withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.cancel_rounded,
                            color: kDanger,
                            size: 56,
                          ),
                        ),
                      ] else ...[
                        _OvalFaceOverlay(isProcessing: isProcessing),
                      ],
                      const SizedBox(height: RSpacing.s24),
                      AnimatedSwitcher(
                        duration: const Duration(milliseconds: 250),
                        child: Text(
                          statusText,
                          key: ValueKey(statusText),
                          textAlign: TextAlign.center,
                          style: inter(
                            fontSize: RTextSize.md,
                            fontWeight: FontWeight.w500,
                            color: isPassed
                                ? kSuccess
                                : isFailed
                                    ? kDanger
                                    : Theme.of(context).colorScheme.onSurface,
                          ),
                        ),
                      ),
                      if (isFailed) ...[
                        const SizedBox(height: RSpacing.s8),
                        Text(
                          'Similitud: ${((kycState as IntraShiftKycFailed).similarity * 100).toStringAsFixed(0)}%',
                          style: inter(
                            fontSize: RTextSize.sm,
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              if (!isPassed) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(RSpacing.s16),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(RRadius.md),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.info_outline,
                        size: 18,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                      const SizedBox(width: RSpacing.s8),
                      Expanded(
                        child: Text(
                          'La captura de imagen estará disponible en la próxima versión.',
                          style: inter(
                            fontSize: RTextSize.sm,
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: RSpacing.s16),
              ],
              if (isIdle) ...[
                FilledButton(
                  onPressed: () =>
                      ref.read(intraShiftKycControllerProvider.notifier).runCheck(_uid),
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
                  child: const Text('Tomar selfie'),
                ),
                const SizedBox(height: RSpacing.s12),
                SizedBox(
                  width: double.infinity,
                  child: TextButton(
                    onPressed: () => ref
                        .read(intraShiftKycControllerProvider.notifier)
                        .runCheck(_uid),
                    style: TextButton.styleFrom(
                      foregroundColor: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                    child: Text(
                      'Saltar (debug)',
                      style: inter(fontSize: RTextSize.sm),
                    ),
                  ),
                ),
              ] else if (isProcessing) ...[
                FilledButton(
                  onPressed: null,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(double.infinity, 48),
                    backgroundColor: kBrandPrimary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(RRadius.md),
                    ),
                  ),
                  child: const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  ),
                ),
              ] else if (isPassed) ...[
                FilledButton(
                  onPressed: () => context.canPop() ? context.pop() : context.go('/home'),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(double.infinity, 48),
                    backgroundColor: kSuccess,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(RRadius.md),
                    ),
                    textStyle: inter(
                      fontSize: RTextSize.base,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  child: const Text('Continuar'),
                ),
              ] else if (isFailed || kycState is IntraShiftKycError) ...[
                FilledButton(
                  onPressed: () =>
                      ref.read(intraShiftKycControllerProvider.notifier).reset(),
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
                  child: const Text('Reintentar'),
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

class _OvalFaceOverlay extends StatelessWidget {
  const _OvalFaceOverlay({required this.isProcessing});

  final bool isProcessing;

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 0.75,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 240),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(120),
            border: Border.all(
              color: isProcessing
                  ? kBrandPrimary
                  : Theme.of(context).colorScheme.outline,
              width: 2,
              style: BorderStyle.solid,
            ),
            color: Theme.of(context).colorScheme.surfaceContainerHighest.withOpacity(0.3),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.face_outlined,
                size: 64,
                color: isProcessing
                    ? kBrandPrimary
                    : Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              if (isProcessing) ...[
                const SizedBox(height: RSpacing.s16),
                const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: kBrandPrimary,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
