import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:remis_design_system/remis_design_system.dart';
import 'package:remis_driver/features/chat/data/chat_repository.dart';
import 'package:remis_driver/features/chat/data/message_model.dart';
import 'package:remis_driver/features/chat/presentation/providers/chat_controller.dart';

const _kQuickReplies = [
  'En camino',
  'Llego en 2 min',
  'Estoy afuera',
  'No te encuentro',
  'Llamame',
];

class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({
    super.key,
    required this.rideId,
    required this.passengerId,
  });

  final String rideId;
  final String passengerId;

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _textController = TextEditingController();
  final _scrollController = ScrollController();
  final _focusNode = FocusNode();

  late final ChatRepository _repo;
  late final String _currentUserId;

  Timer? _typingDebounce;
  bool _isSending = false;

  @override
  void initState() {
    super.initState();
    _repo = ChatRepository(Supabase.instance.client);
    _currentUserId = Supabase.instance.client.auth.currentUser!.id;
  }

  @override
  void dispose() {
    _typingDebounce?.cancel();
    _textController.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _onTextChanged(String value) {
    _typingDebounce?.cancel();
    if (value.isEmpty) return;
    _typingDebounce = Timer(const Duration(milliseconds: 500), () {
      _repo
          .broadcastTyping(rideId: widget.rideId, senderId: _currentUserId)
          .ignore();
    });
  }

  Future<void> _sendMessage(String content) async {
    final trimmed = content.trim();
    if (trimmed.isEmpty || _isSending) return;

    setState(() => _isSending = true);
    _textController.clear();

    try {
      await _repo.sendMessage(
        rideId: widget.rideId,
        senderId: _currentUserId,
        content: trimmed,
      );
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final messagesAsync = ref.watch(chatMessagesProvider(widget.rideId));
    final typingAsync = ref.watch(typingIndicatorProvider(widget.rideId));

    final passengerIsTyping = typingAsync.valueOrNull == widget.passengerId;

    return Scaffold(
      backgroundColor: kNeutral50Light,
      appBar: AppBar(
        backgroundColor: kNeutral0Light,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.close),
          color: kNeutral900Light,
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Chat con pasajero',
          style: interTight(
            fontSize: RTextSize.md,
            fontWeight: FontWeight.w600,
            color: kNeutral900Light,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: kNeutral200Light),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: messagesAsync.when(
              loading: () => const Center(
                child: CircularProgressIndicator(color: kBrandAccent),
              ),
              error: (e, _) => Center(
                child: Text(
                  'Error cargando mensajes',
                  style: inter(color: kNeutral500Light),
                ),
              ),
              data: (messages) => _MessagesList(
                messages: messages,
                currentUserId: _currentUserId,
                scrollController: _scrollController,
                passengerIsTyping: passengerIsTyping,
              ),
            ),
          ),
          _QuickRepliesRow(onTap: _sendMessage),
          _InputRow(
            controller: _textController,
            focusNode: _focusNode,
            isSending: _isSending,
            onChanged: _onTextChanged,
            onSend: () => _sendMessage(_textController.text),
          ),
        ],
      ),
    );
  }
}

class _MessagesList extends StatelessWidget {
  const _MessagesList({
    required this.messages,
    required this.currentUserId,
    required this.scrollController,
    required this.passengerIsTyping,
  });

  final List<MessageModel> messages;
  final String currentUserId;
  final ScrollController scrollController;
  final bool passengerIsTyping;

  @override
  Widget build(BuildContext context) {
    final totalItems = messages.length + (passengerIsTyping ? 1 : 0);

    return ListView.builder(
      controller: scrollController,
      reverse: true,
      padding: const EdgeInsets.symmetric(
        horizontal: RSpacing.s16,
        vertical: RSpacing.s12,
      ),
      itemCount: totalItems,
      itemBuilder: (context, index) {
        if (passengerIsTyping && index == 0) {
          return const _TypingBubble();
        }

        final messageIndex =
            passengerIsTyping ? index - 1 : index;
        final message =
            messages[messages.length - 1 - messageIndex];
        final isOwn = message.senderId == currentUserId;

        return _MessageBubble(
          key: ValueKey(message.id),
          message: message,
          isOwn: isOwn,
        );
      },
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({
    super.key,
    required this.message,
    required this.isOwn,
  });

  final MessageModel message;
  final bool isOwn;

  @override
  Widget build(BuildContext context) {
    final bubbleColor = isOwn ? kBrandPrimary : kNeutral100Light;
    final textColor = isOwn ? Colors.white : kNeutral900Light;

    final borderRadius = BorderRadius.only(
      topLeft: const Radius.circular(RRadius.xl2),
      topRight: const Radius.circular(RRadius.xl2),
      bottomLeft:
          Radius.circular(isOwn ? RRadius.xl2 : RRadius.sm),
      bottomRight:
          Radius.circular(isOwn ? RRadius.sm : RRadius.xl2),
    );

    final time =
        '${message.createdAt.hour.toString().padLeft(2, '0')}:${message.createdAt.minute.toString().padLeft(2, '0')}';

    return Padding(
      padding: const EdgeInsets.only(bottom: RSpacing.s8),
      child: Row(
        mainAxisAlignment:
            isOwn ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isOwn) const SizedBox(width: RSpacing.s8),
          Flexible(
            child: Column(
              crossAxisAlignment: isOwn
                  ? CrossAxisAlignment.end
                  : CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: RSpacing.s16,
                    vertical: RSpacing.s12,
                  ),
                  constraints: BoxConstraints(
                    maxWidth:
                        MediaQuery.of(context).size.width * 0.72,
                  ),
                  decoration: BoxDecoration(
                    color: bubbleColor,
                    borderRadius: borderRadius,
                  ),
                  child: Text(
                    message.content,
                    style: inter(
                      fontSize: RTextSize.sm,
                      color: textColor,
                      height: 1.4,
                    ),
                  ),
                ),
                const SizedBox(height: RSpacing.s4),
                Text(
                  time,
                  style: inter(
                    fontSize: RTextSize.xs2,
                    color: kNeutral500Light,
                  ),
                ),
              ],
            ),
          ),
          if (isOwn) const SizedBox(width: RSpacing.s8),
        ],
      ),
    )
        .animate()
        .fadeIn(duration: 200.ms)
        .slideX(
          begin: isOwn ? 0.15 : -0.15,
          end: 0,
          duration: 200.ms,
          curve: Curves.easeOut,
        );
  }
}

class _TypingBubble extends StatefulWidget {
  const _TypingBubble();

  @override
  State<_TypingBubble> createState() => _TypingBubbleState();
}

class _TypingBubbleState extends State<_TypingBubble>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
    _animation = Tween<double>(begin: 0.4, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(
        bottom: RSpacing.s8,
        left: RSpacing.s8,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: RSpacing.s16,
              vertical: RSpacing.s12,
            ),
            decoration: const BoxDecoration(
              color: kNeutral100Light,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(RRadius.xl2),
                topRight: Radius.circular(RRadius.xl2),
                bottomRight: Radius.circular(RRadius.xl2),
                bottomLeft: Radius.circular(RRadius.sm),
              ),
            ),
            child: AnimatedBuilder(
              animation: _animation,
              builder: (context, _) {
                return Row(
                  mainAxisSize: MainAxisSize.min,
                  children: List.generate(3, (i) {
                    return Padding(
                      padding: EdgeInsets.only(right: i < 2 ? 4.0 : 0),
                      child: Opacity(
                        opacity: (_animation.value - i * 0.15).clamp(0.2, 1.0),
                        child: Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: kNeutral500Light,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ),
                    );
                  }),
                );
              },
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 150.ms);
  }
}

class _QuickRepliesRow extends StatelessWidget {
  const _QuickRepliesRow({required this.onTap});

  final Future<void> Function(String) onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 44,
      color: kNeutral0Light,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(
          horizontal: RSpacing.s16,
          vertical: RSpacing.s6,
        ),
        itemCount: _kQuickReplies.length,
        separatorBuilder: (_, __) =>
            const SizedBox(width: RSpacing.s8),
        itemBuilder: (context, index) {
          final label = _kQuickReplies[index];
          return ActionChip(
            label: Text(
              label,
              style: inter(
                fontSize: RTextSize.xs,
                fontWeight: FontWeight.w500,
                color: kBrandPrimary,
              ),
            ),
            backgroundColor: kNeutral100Light,
            side: const BorderSide(color: kNeutral200Light),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(RRadius.full),
            ),
            padding: const EdgeInsets.symmetric(
              horizontal: RSpacing.s4,
            ),
            onPressed: () => onTap(label),
          );
        },
      ),
    );
  }
}

class _InputRow extends StatelessWidget {
  const _InputRow({
    required this.controller,
    required this.focusNode,
    required this.isSending,
    required this.onChanged,
    required this.onSend,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final bool isSending;
  final ValueChanged<String> onChanged;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.paddingOf(context).bottom;

    return Container(
      padding: EdgeInsets.fromLTRB(
        RSpacing.s12,
        RSpacing.s8,
        RSpacing.s8,
        RSpacing.s8 + bottomPadding,
      ),
      decoration: const BoxDecoration(
        color: kNeutral0Light,
        border: Border(
          top: BorderSide(color: kNeutral200Light),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 120),
              child: TextField(
                controller: controller,
                focusNode: focusNode,
                onChanged: onChanged,
                onSubmitted: (_) => onSend(),
                textInputAction: TextInputAction.send,
                maxLines: null,
                keyboardType: TextInputType.multiline,
                style: inter(
                  fontSize: RTextSize.sm,
                  color: kNeutral900Light,
                ),
                decoration: InputDecoration(
                  hintText: 'Escribe un mensaje...',
                  hintStyle: inter(
                    fontSize: RTextSize.sm,
                    color: kNeutral400Light,
                  ),
                  filled: true,
                  fillColor: kNeutral100Light,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: RSpacing.s16,
                    vertical: RSpacing.s12,
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(RRadius.xl2),
                    borderSide: BorderSide.none,
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(RRadius.xl2),
                    borderSide: BorderSide.none,
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(RRadius.xl2),
                    borderSide: const BorderSide(
                      color: kBrandPrimary,
                      width: 1.5,
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: RSpacing.s4),
          SizedBox(
            width: 44,
            height: 44,
            child: IconButton(
              onPressed: isSending ? null : onSend,
              style: IconButton.styleFrom(
                backgroundColor: kBrandAccent,
                disabledBackgroundColor:
                    kBrandAccent.withValues(alpha: 0.5),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(RRadius.xl2),
                ),
                padding: EdgeInsets.zero,
              ),
              icon: isSending
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(
                      Icons.send_rounded,
                      color: Colors.white,
                      size: 20,
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
