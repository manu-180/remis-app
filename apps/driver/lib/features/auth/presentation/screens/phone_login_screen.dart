import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:remis_design_system/remis_design_system.dart';
import 'package:remis_driver/features/auth/presentation/providers/auth_controller.dart';

class PhoneLoginScreen extends ConsumerStatefulWidget {
  const PhoneLoginScreen({super.key});

  @override
  ConsumerState<PhoneLoginScreen> createState() => _PhoneLoginScreenState();
}

class _PhoneLoginScreenState extends ConsumerState<PhoneLoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  final _phoneFocus = FocusNode();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _phoneFocus.requestFocus();
    });
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _phoneFocus.dispose();
    super.dispose();
  }

  String get _fullPhone => '+549${_phoneController.text.replaceAll(RegExp(r'\D'), '')}';

  bool _isValidPhone(String raw) {
    final digits = raw.replaceAll(RegExp(r'\D'), '');
    // Argentine mobile: 9 followed by 10 digits (area + number)
    return RegExp(r'^9\d{10}$').hasMatch(digits);
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    unawaited(HapticFeedback.lightImpact());
    final ctrl = ref.read(driverAuthControllerProvider.notifier);
    final success = await ctrl.sendOtp(_fullPhone);
    if (success && mounted) {
      context.go('/auth/otp?phone=${Uri.encodeComponent(_fullPhone)}');
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(driverAuthControllerProvider);
    final isLoading = authState is AuthLoading;

    ref.listen(driverAuthControllerProvider, (_, next) {
      if (next is AuthFailure) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.message),
            backgroundColor: kDanger,
            behavior: SnackBarBehavior.floating,
          ),
        );
        ref.read(driverAuthControllerProvider.notifier).reset();
      }
    });

    return Scaffold(
      body: SafeArea(
        child: Form(
          key: _formKey,
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
                Text(
                  'Hola.',
                  style: interTight(
                    fontSize: RTextSize.xl3,
                    fontWeight: FontWeight.w700,
                    color: Theme.of(context).colorScheme.onSurface,
                    letterSpacing: -0.02 * RTextSize.xl3,
                    height: 1.05,
                  ),
                ),
                const SizedBox(height: RSpacing.s8),
                Text(
                  'Ingresá tu teléfono.',
                  style: inter(
                    fontSize: RTextSize.md,
                    fontWeight: FontWeight.w400,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: RSpacing.s32),
                _PhoneField(
                  controller: _phoneController,
                  focusNode: _phoneFocus,
                  enabled: !isLoading,
                  validator: (v) {
                    if (v == null || v.isEmpty) return 'Ingresá tu número.';
                    if (!_isValidPhone(v)) return 'El número no es válido.';
                    return null;
                  },
                  onSubmitted: (_) => _submit(),
                ),
                const SizedBox(height: RSpacing.s12),
                Text(
                  'Te vamos a mandar un código por SMS.',
                  style: inter(
                    fontSize: RTextSize.sm,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
                const Spacer(),
                FilledButton(
                  onPressed: isLoading ? null : _submit,
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
                      : const Text('Continuar'),
                ),
                const SizedBox(height: RSpacing.s16),
                Center(
                  child: TextButton(
                    onPressed: () {},
                    child: Text(
                      '¿Problemas? Llamanos',
                      style: inter(
                        fontSize: RTextSize.sm,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: RSpacing.s24),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _PhoneField extends StatelessWidget {
  const _PhoneField({
    required this.controller,
    required this.focusNode,
    required this.enabled,
    required this.validator,
    required this.onSubmitted,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final bool enabled;
  final FormFieldValidator<String> validator;
  final ValueChanged<String> onSubmitted;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      focusNode: focusNode,
      enabled: enabled,
      keyboardType: TextInputType.phone,
      textInputAction: TextInputAction.done,
      inputFormatters: [
        FilteringTextInputFormatter.digitsOnly,
        LengthLimitingTextInputFormatter(11),
      ],
      onFieldSubmitted: onSubmitted,
      validator: validator,
      decoration: InputDecoration(
        hintText: '9 2954 XXX XXX',
        prefixText: '+54  ',
        prefixStyle: inter(
          fontSize: RTextSize.base,
          fontWeight: FontWeight.w500,
          color: Theme.of(context).colorScheme.onSurface,
        ),
      ),
      style: inter(fontSize: RTextSize.base),
    );
  }
}
