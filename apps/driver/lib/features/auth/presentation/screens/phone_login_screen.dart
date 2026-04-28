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

  // User types 10 digits (area + number). We prepend +549.
  // E.g. "2954123456" → "+5492954123456" ✓
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
                  icon: Icon(Icons.arrow_back, color: colorScheme.onSurface),
                  padding: EdgeInsets.zero,
                ),
                const SizedBox(height: RSpacing.s40),
                Text(
                  'Hola.',
                  style: interTight(
                    fontSize: RTextSize.xl3,
                    fontWeight: FontWeight.w700,
                    color: colorScheme.onSurface,
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
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: RSpacing.s32),
                _PremiumPhoneField(
                  controller: _phoneController,
                  focusNode: _phoneFocus,
                  enabled: !isLoading,
                  validator: (v) {
                    if (v == null || v.isEmpty) return 'Ingresá tu número.';
                    if (!_isValidPhone(v)) {
                      return 'Ingresá los 10 dígitos de tu número.';
                    }
                    return null;
                  },
                  onSubmitted: (_) => _submit(),
                ),
                const SizedBox(height: RSpacing.s12),
                Text(
                  'Te vamos a mandar un código por SMS.',
                  style: inter(
                    fontSize: RTextSize.sm,
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
                const Spacer(),
                FilledButton(
                  onPressed: isLoading ? null : _submit,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(double.infinity, 56),
                    backgroundColor: kBrandPrimary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(RRadius.md),
                    ),
                    textStyle: inter(
                      fontSize: RTextSize.base,
                      fontWeight: FontWeight.w600,
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
                        color: colorScheme.onSurfaceVariant,
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

// ─── Premium phone field ────────────────────────────────────────────────────

class _PremiumPhoneField extends StatelessWidget {
  const _PremiumPhoneField({
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
    final colorScheme = Theme.of(context).colorScheme;

    return TextFormField(
      controller: controller,
      focusNode: focusNode,
      enabled: enabled,
      keyboardType: TextInputType.phone,
      textInputAction: TextInputAction.done,
      inputFormatters: [_PhoneInputFormatter()],
      onFieldSubmitted: onSubmitted,
      validator: validator,
      style: inter(
        fontSize: 26,
        fontWeight: FontWeight.w600,
        color: colorScheme.onSurface,
        letterSpacing: 1.5,
      ),
      decoration: InputDecoration(
        hintText: '2954 123456',
        hintStyle: inter(
          fontSize: 26,
          fontWeight: FontWeight.w400,
          color: colorScheme.onSurfaceVariant.withValues(alpha: 0.4),
          letterSpacing: 1.5,
        ),
        // No left padding — handled by the prefix widget
        contentPadding: const EdgeInsets.fromLTRB(0, 22, 20, 22),
        filled: true,
        fillColor: enabled
            ? colorScheme.surface
            : colorScheme.onSurface.withValues(alpha: 0.04),
        prefix: _CountryPrefix(colorScheme: colorScheme),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: colorScheme.outline, width: 1.5),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: kBrandPrimary, width: 2.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: colorScheme.error, width: 1.5),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: colorScheme.error, width: 2.5),
        ),
        disabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(
            color: colorScheme.outline.withValues(alpha: 0.4),
            width: 1,
          ),
        ),
        errorStyle: inter(
          fontSize: RTextSize.sm,
          color: colorScheme.error,
        ),
      ),
    );
  }
}

class _CountryPrefix extends StatelessWidget {
  const _CountryPrefix({required this.colorScheme});
  final ColorScheme colorScheme;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 18, right: 14),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('🇦🇷', style: TextStyle(fontSize: 22)),
          const SizedBox(width: 10),
          Text(
            '+54 9',
            style: inter(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: colorScheme.onSurface,
            ),
          ),
          const SizedBox(width: 14),
          Container(
            width: 1.5,
            height: 30,
            color: colorScheme.outlineVariant,
          ),
          const SizedBox(width: 14),
        ],
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

    // Format as XXXX XXXXXX (4 + 6)
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
