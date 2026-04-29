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

  String get _fullPhone =>
      '+549${_phoneController.text.replaceAll(RegExp(r'\D'), '')}';

  bool _isValidPhone(String raw) {
    final digits = raw.replaceAll(RegExp(r'\D'), '');
    return digits.length == 10;
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
    final colorScheme = Theme.of(context).colorScheme;

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
      backgroundColor: colorScheme.surface,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(
            horizontal: RSpacing.s24,
            vertical: RSpacing.s48,
          ),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: RSpacing.s24),
                Text(
                  'Hola, ¿listo para\nmanejar hoy?',
                  style: interTight(
                    fontSize: RTextSize.xl2,
                    fontWeight: FontWeight.w600,
                    letterSpacing: -0.01 * RTextSize.xl2,
                    color: colorScheme.onSurface,
                    height: 1.1,
                  ),
                ),
                const SizedBox(height: RSpacing.s8),
                Text(
                  'Ingresá tu número de teléfono para continuar.',
                  style: inter(
                    fontSize: RTextSize.base,
                    color: colorScheme.onSurfaceVariant,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: RSpacing.s40),
                Text(
                  'Número de celular',
                  style: inter(
                    fontSize: RTextSize.sm,
                    fontWeight: FontWeight.w500,
                    color: colorScheme.onSurface,
                  ),
                ),
                const SizedBox(height: RSpacing.s6),
                TextFormField(
                  controller: _phoneController,
                  focusNode: _phoneFocus,
                  enabled: !isLoading,
                  keyboardType: TextInputType.phone,
                  textInputAction: TextInputAction.done,
                  inputFormatters: [_PhoneInputFormatter()],
                  onFieldSubmitted: (_) => _submit(),
                  style: inter(
                    fontSize: RTextSize.base,
                    color: colorScheme.onSurface,
                  ),
                  decoration: const InputDecoration(
                    hintText: '2954 555 123',
                    prefixText: '+54 9 ',
                  ),
                  validator: (v) {
                    if (v == null || v.isEmpty) {
                      return 'Ingresá tu número.';
                    }
                    if (!_isValidPhone(v)) {
                      return 'Ingresá los 10 dígitos de tu número.';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: RSpacing.s32),
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
                      : const Text('Recibir código'),
                ),
                const SizedBox(height: RSpacing.s24),
                Text(
                  'Te enviaremos un código por SMS para verificar tu número.',
                  style: inter(
                    fontSize: RTextSize.xs,
                    color: colorScheme.onSurfaceVariant,
                    height: 1.5,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ─── Formatter ──────────────────────────────────────────────────────────────

class _PhoneInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final digits = newValue.text.replaceAll(RegExp(r'\D'), '');
    final limited = digits.length > 10 ? digits.substring(0, 10) : digits;

    final buf = StringBuffer();
    for (var i = 0; i < limited.length; i++) {
      if (i == 4) buf.write(' ');
      buf.write(limited[i]);
    }

    final formatted = buf.toString();
    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}
