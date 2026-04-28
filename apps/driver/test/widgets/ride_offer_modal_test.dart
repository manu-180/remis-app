// Widget tests for RideOfferModal.
//
// Design notes:
//   - RideOfferModal wraps its content in DraggableScrollableSheet, which
//     requires finite height from its ancestor. We use a fixed SizedBox.
//   - Buttons are RPremiumActionButton (GestureDetector-based). We tap by
//     finding the Text label widget inside.
//   - The slideY animation from flutter_animate uses the ticker. We call
//     pump(Duration(milliseconds: 450)) once to let the 400 ms animation
//     finish before asserting on content.
//   - We never call pumpAndSettle() — the Timer.periodic inside the modal
//     would make it run forever.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:remis_driver/features/ride/data/ride_model.dart';
import 'package:remis_driver/features/ride/presentation/widgets/ride_offer_modal.dart';
import '../factories/ride_factory.dart';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/// Default offer sourced from RideFactory for consistency with other tests.
RideModel _fakeOffer({
  String pickupAddress = 'Av. San Martín 123, Santa Rosa',
  String destAddress = 'Belgrano 456, Santa Rosa',
  double? estimatedFareArs = 1500.0,
  String? notes,
}) {
  final base = RideFactory.requested();
  return RideModel(
    id: base.id,
    status: base.status,
    pickupAddress: pickupAddress,
    destAddress: destAddress,
    passengerId: base.passengerId,
    requestedAt: base.requestedAt,
    estimatedFareArs: estimatedFareArs,
    notes: notes,
  );
}

/// Wraps the modal in a MaterialApp with a known finite size so that
/// DraggableScrollableSheet can compute its layout.
Widget _buildModal({
  required RideModel offer,
  VoidCallback? onAccept,
  VoidCallback? onReject,
  VoidCallback? onExpired,
}) {
  return MaterialApp(
    home: Scaffold(
      body: SizedBox(
        width: 400,
        height: 800,
        child: RideOfferModal(
          offer: offer,
          onAccept: onAccept ?? () {},
          onReject: onReject ?? () {},
          onExpired: onExpired ?? () {},
        ),
      ),
    ),
  );
}

/// Pumps enough frames to finish the 400 ms slide-in animation.
Future<void> _settleAnimation(WidgetTester tester) async {
  await tester.pump(const Duration(milliseconds: 450));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

void main() {
  group('RideOfferModal', () {
    // ── Content rendering ──────────────────────────────────────────────────────

    testWidgets('renders pickup address', (tester) async {
      await tester.pumpWidget(_buildModal(offer: _fakeOffer()));
      await _settleAnimation(tester);
      expect(find.text('Av. San Martín 123, Santa Rosa'), findsOneWidget);
    });

    testWidgets('renders destination address', (tester) async {
      await tester.pumpWidget(_buildModal(offer: _fakeOffer()));
      await _settleAnimation(tester);
      expect(find.text('Belgrano 456, Santa Rosa'), findsOneWidget);
    });

    testWidgets('renders formatted fare when provided', (tester) async {
      await tester.pumpWidget(_buildModal(offer: _fakeOffer(estimatedFareArs: 1500.0)));
      await _settleAnimation(tester);
      expect(find.text('\$ 1500.00'), findsOneWidget);
    });

    testWidgets('renders "No especificada" when fare is null', (tester) async {
      await tester.pumpWidget(_buildModal(offer: _fakeOffer(estimatedFareArs: null)));
      await _settleAnimation(tester);
      expect(find.text('No especificada'), findsOneWidget);
    });

    testWidgets('renders notes when present', (tester) async {
      await tester.pumpWidget(
        _buildModal(offer: _fakeOffer(notes: 'Pasajero con bastón')),
      );
      await _settleAnimation(tester);
      expect(find.text('Pasajero con bastón'), findsOneWidget);
    });

    testWidgets('does not render notes row when notes is null', (tester) async {
      await tester.pumpWidget(_buildModal(offer: _fakeOffer(notes: null)));
      await _settleAnimation(tester);
      expect(find.text('Pasajero con bastón'), findsNothing);
    });

    testWidgets('renders "¡Nuevo pedido!" header', (tester) async {
      await tester.pumpWidget(_buildModal(offer: _fakeOffer()));
      await _settleAnimation(tester);
      expect(find.text('¡Nuevo pedido!'), findsOneWidget);
    });

    testWidgets('renders Aceptar and Rechazar buttons', (tester) async {
      await tester.pumpWidget(_buildModal(offer: _fakeOffer()));
      await _settleAnimation(tester);
      expect(find.text('Aceptar'), findsOneWidget);
      expect(find.text('Rechazar'), findsOneWidget);
    });

    // ── Countdown display ──────────────────────────────────────────────────────

    testWidgets('shows initial countdown of 30', (tester) async {
      await tester.pumpWidget(_buildModal(offer: _fakeOffer()));
      // Use pump(Duration.zero) to render first frame without advancing time.
      await tester.pump(Duration.zero);
      expect(find.text('30'), findsOneWidget);
    });

    testWidgets('countdown decrements to 29 after one second', (tester) async {
      await tester.pumpWidget(_buildModal(offer: _fakeOffer()));
      await tester.pump(Duration.zero);
      expect(find.text('30'), findsOneWidget);

      await tester.pump(const Duration(seconds: 1));
      expect(find.text('29'), findsOneWidget);
    });

    testWidgets('countdown decrements to 25 after five seconds', (tester) async {
      await tester.pumpWidget(_buildModal(offer: _fakeOffer()));
      await tester.pump(Duration.zero);
      for (var i = 0; i < 5; i++) {
        await tester.pump(const Duration(seconds: 1));
      }
      expect(find.text('25'), findsOneWidget);
    });

    // ── Callbacks ──────────────────────────────────────────────────────────────

    testWidgets('onAccept callback fires when Aceptar is tapped', (tester) async {
      var accepted = false;
      await tester.pumpWidget(
        _buildModal(
          offer: _fakeOffer(),
          onAccept: () => accepted = true,
        ),
      );
      await _settleAnimation(tester);

      await tester.tap(find.text('Aceptar'));
      await tester.pump();
      expect(accepted, true);
    });

    testWidgets('onReject callback fires when Rechazar is tapped', (tester) async {
      var rejected = false;
      await tester.pumpWidget(
        _buildModal(
          offer: _fakeOffer(),
          onReject: () => rejected = true,
        ),
      );
      await _settleAnimation(tester);

      await tester.tap(find.text('Rechazar'));
      await tester.pump();
      expect(rejected, true);
    });

    testWidgets('onReject is NOT called when Aceptar is tapped', (tester) async {
      var rejected = false;
      await tester.pumpWidget(
        _buildModal(
          offer: _fakeOffer(),
          onReject: () => rejected = true,
        ),
      );
      await _settleAnimation(tester);

      await tester.tap(find.text('Aceptar'));
      await tester.pump();
      expect(rejected, false);
    });

    testWidgets('onAccept is NOT called when Rechazar is tapped', (tester) async {
      var accepted = false;
      await tester.pumpWidget(
        _buildModal(
          offer: _fakeOffer(),
          onAccept: () => accepted = true,
        ),
      );
      await _settleAnimation(tester);

      await tester.tap(find.text('Rechazar'));
      await tester.pump();
      expect(accepted, false);
    });

    testWidgets('Aceptar button becomes loading (disabled) after first tap', (tester) async {
      // After tapping Aceptar the widget sets _accepting = true, which passes
      // isLoading: true and onPressed: null to RPremiumActionButton. A second
      // tap must NOT fire onAccept again.
      var callCount = 0;
      await tester.pumpWidget(
        _buildModal(
          offer: _fakeOffer(),
          onAccept: () => callCount++,
        ),
      );
      await _settleAnimation(tester);

      await tester.tap(find.text('Aceptar'));
      await tester.pump();
      // Try tapping again — should be a no-op.
      await tester.tap(find.text('Aceptar'), warnIfMissed: false);
      await tester.pump();

      expect(callCount, 1);
    });

    // ── Expiry ─────────────────────────────────────────────────────────────────

    testWidgets('onExpired fires after 30 seconds', (tester) async {
      var expired = false;
      await tester.pumpWidget(
        _buildModal(
          offer: _fakeOffer(),
          onExpired: () => expired = true,
        ),
      );
      await tester.pump(Duration.zero);

      // Advance the clock one second at a time so the periodic timer fires
      // exactly 30 times (matching how the widget counts down).
      for (var i = 0; i < 30; i++) {
        await tester.pump(const Duration(seconds: 1));
      }

      expect(expired, true);
    });

    testWidgets('onExpired does NOT fire before 30 seconds elapse', (tester) async {
      var expired = false;
      await tester.pumpWidget(
        _buildModal(
          offer: _fakeOffer(),
          onExpired: () => expired = true,
        ),
      );
      await tester.pump(Duration.zero);

      for (var i = 0; i < 29; i++) {
        await tester.pump(const Duration(seconds: 1));
      }

      expect(expired, false);
    });
  });
}
