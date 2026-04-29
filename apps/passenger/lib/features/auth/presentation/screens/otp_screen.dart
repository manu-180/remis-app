import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/mock_auth.dart';
import '../../../../core/routing/app_router.dart';
import '../../../../core/theme/app_theme.dart';

class OtpScreen extends ConsumerStatefulWidget {
  const OtpScreen({super.key, required this.phone});

  final String phone;

  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  final _controllers = List.generate(6, (_) => TextEditingController());
  final _focusNodes = List.generate(6, (_) => FocusNode());
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    for (final c in _controllers) {
      c.dispose();
    }
    for (final f in _focusNodes) {
      f.dispose();
    }
    super.dispose();
  }

  String get _code => _controllers.map((c) => c.text).join();

  Future<void> _verify() async {
    if (_code.length < 6) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final client = ref.read(supabaseClientProvider);
      await verifyOtp(
        phone: '+549${widget.phone}',
        token: _code,
        client: client,
      );
      if (!mounted) return;
      // OTP verified — now check if passenger profile exists
      try {
        final user = client.auth.currentUser;
        if (user != null) {
          final profile = await client
              .from('passengers')
              .select('id')
              .eq('id', user.id)
              .maybeSingle();
          if (!mounted) return;
          if (profile == null) {
            context.go(AppRoutes.onboardingName);
          } else {
            context.go(AppRoutes.home);
          }
        }
      } catch (_) {
        if (!mounted) return;
        context.go(AppRoutes.onboardingName);
      }
    } on AuthException catch (e) {
      setState(() => _error = 'Código incorrecto — ${e.message}');
    } catch (_) {
      setState(
        () => _error = 'No pudimos verificar el código. Intentá de nuevo.',
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _onDigitEntered(int index, String value) {
    if (value.isNotEmpty && index < 5) {
      _focusNodes[index + 1].requestFocus();
    }
    if (_code.length == 6) _verify();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Verificá tu número',
                style: Theme.of(context).textTheme.headlineLarge,
              ),
              const SizedBox(height: 8),
              Text(
                'Enviamos un código de 6 dígitos a +54 9 ${widget.phone}',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: AppColors.neutral500,
                    ),
              ),
              const SizedBox(height: 40),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: List.generate(6, (i) => _buildDigitBox(i)),
              ),
              if (_error != null) ...[
                const SizedBox(height: 16),
                Text(
                  _error!,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppColors.danger,
                      ),
                  textAlign: TextAlign.center,
                ),
              ],
              const SizedBox(height: 32),
              FilledButton(
                onPressed: (_loading || _code.length < 6) ? null : _verify,
                child: _loading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text('Confirmar'),
              ),
              const SizedBox(height: 24),
              TextButton(
                onPressed: () async {
                  final client = ref.read(supabaseClientProvider);
                  final messenger = ScaffoldMessenger.of(context);
                  await signInWithOtp(phone: '+549${widget.phone}', client: client);
                  if (!mounted) return;
                  messenger.showSnackBar(
                    const SnackBar(content: Text('Código reenviado')),
                  );
                },
                child: const Text('Reenviar código'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDigitBox(int index) {
    return SizedBox(
      width: 44,
      height: 56,
      child: TextField(
        controller: _controllers[index],
        focusNode: _focusNodes[index],
        keyboardType: TextInputType.number,
        textAlign: TextAlign.center,
        maxLength: 1,
        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
        decoration: InputDecoration(
          counterText: '',
          contentPadding: EdgeInsets.zero,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
        ),
        style: Theme.of(context).textTheme.headlineMedium,
        onChanged: (v) => _onDigitEntered(index, v),
        onTap: () => _controllers[index].selection = TextSelection(
          baseOffset: 0,
          extentOffset: _controllers[index].text.length,
        ),
        onSubmitted: (_) => _verify(),
      ),
    );
  }
}
