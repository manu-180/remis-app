import 'dart:async' show Timer, unawaited;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:remis_design_system/remis_design_system.dart';
import 'package:remis_driver/features/auth/presentation/providers/auth_controller.dart';

class OtpVerifyScreen extends ConsumerStatefulWidget {
  const OtpVerifyScreen({super.key, required this.phone});

  final String phone;

  @override
  ConsumerState<OtpVerifyScreen> createState() => _OtpVerifyScreenState();
}

class _OtpVerifyScreenState extends ConsumerState<OtpVerifyScreen> {
  final _otpController = TextEditingController();
  final _focusNode = FocusNode();
  static const _otpLength = 6;
  static const _resendSeconds = 60;

  int _remaining = _resendSeconds;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startTimer();
    WidgetsBinding.instance.addPostFrameCallback((_) => _focusNode.requestFocus());
  }

  @override
  void dispose() {
    _timer?.cancel();
    _otpController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _startTimer() {
    _timer?.cancel();
    setState(() => _remaining = _resendSeconds);
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_remaining <= 1) {
        _timer?.cancel();
        setState(() => _remaining = 0);
      } else {
        setState(() => _remaining--);
      }
    });
  }

  Future<void> _verify(String token) async {
    if (token.length != _otpLength) return;
    unawaited(HapticFeedback.lightImpact());
    final ctrl = ref.read(driverAuthControllerProvider.notifier);
    final success = await ctrl.verifyOtp(phone: widget.phone, token: token);
    if (success && mounted) context.go('/home');
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
        _otpController.clear();
        ref.read(driverAuthControllerProvider.notifier).reset();
      }
    });

    final otp = _otpController.text;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: RSpacing.s24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: RSpacing.s12),
              IconButton(
                onPressed: () => context.go('/auth/login'),
                icon: const Icon(Icons.arrow_back),
                padding: EdgeInsets.zero,
              ),
              const SizedBox(height: RSpacing.s40),
              Text(
                'Revisá tu SMS.',
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
                'Mandamos un código a ${widget.phone}',
                style: inter(
                  fontSize: RTextSize.md,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: RSpacing.s32),
              // Hidden text field drives the OTP display
              Stack(
                children: [
                  _OtpBoxes(otp: otp, length: _otpLength),
                  Opacity(
                    opacity: 0,
                    child: TextField(
                      controller: _otpController,
                      focusNode: _focusNode,
                      enabled: !isLoading,
                      keyboardType: TextInputType.number,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                        LengthLimitingTextInputFormatter(_otpLength),
                      ],
                      onChanged: (v) {
                        setState(() {});
                        if (v.length == _otpLength) _verify(v);
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: RSpacing.s32),
              Center(
                child: _remaining > 0
                    ? Text(
                        'Podés pedir otro código en ${_remaining}s',
                        style: inter(
                          fontSize: RTextSize.sm,
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      )
                    : TextButton(
                        onPressed: () {
                          _startTimer();
                          final ctrl = ref.read(driverAuthControllerProvider.notifier);
                          ctrl.sendOtp(widget.phone);
                        },
                        child: Text(
                          'Reenviar código',
                          style: inter(
                            fontSize: RTextSize.sm,
                            color: kBrandPrimary,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
              ),
              const Spacer(),
              if (isLoading)
                const Center(
                  child: CircularProgressIndicator(),
                ),
              const SizedBox(height: RSpacing.s48),
            ],
          ),
        ),
      ),
    );
  }
}

class _OtpBoxes extends StatelessWidget {
  const _OtpBoxes({required this.otp, required this.length});

  final String otp;
  final int length;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: List.generate(length, (i) {
        final char = i < otp.length ? otp[i] : '';
        final isFocused = i == otp.length;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          width: 44,
          height: 56,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(RRadius.md),
            border: Border.all(
              color: isFocused
                  ? kBrandPrimary
                  : char.isNotEmpty
                      ? kBrandPrimary.withValues(alpha: 0.5)
                      : theme.colorScheme.outlineVariant,
              width: isFocused ? 2 : 1,
            ),
          ),
          child: char.isEmpty
              ? const SizedBox.shrink()
              : Text(
                  char,
                  style: interTight(
                    fontSize: RTextSize.xl,
                    fontWeight: FontWeight.w600,
                    color: theme.colorScheme.onSurface,
                  ),
                ),
        );
      }),
    );
  }
}
