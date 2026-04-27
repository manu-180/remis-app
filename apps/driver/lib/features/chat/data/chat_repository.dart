import 'dart:async';

import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:remis_driver/features/chat/data/message_model.dart';

class ChatRepository {
  ChatRepository(this._client);

  final SupabaseClient _client;

  Stream<List<MessageModel>> watchMessages(String rideId) {
    return _client
        .from('messages')
        .stream(primaryKey: ['id'])
        .eq('ride_id', rideId)
        .order('created_at')
        .map((rows) => rows.map(MessageModel.fromMap).toList());
  }

  Future<void> sendMessage({
    required String rideId,
    required String senderId,
    required String content,
  }) async {
    await _client.from('messages').insert({
      'ride_id': rideId,
      'sender_id': senderId,
      'content': content,
    });
  }

  Future<void> markAsRead({
    required String rideId,
    required String readerId,
  }) async {
    await _client
        .from('messages')
        .update({'read_at': DateTime.now().toIso8601String()})
        .eq('ride_id', rideId)
        .neq('sender_id', readerId)
        .isFilter('read_at', null);
  }

  Future<void> broadcastTyping({
    required String rideId,
    required String senderId,
  }) async {
    final channel = _client.channel('typing:$rideId');
    await channel.sendBroadcastMessage(
      event: 'typing',
      payload: {'sender_id': senderId},
    );
  }

  Stream<String?> watchTyping(String rideId) {
    final controller = StreamController<String?>.broadcast();
    Timer? nullTimer;

    final channel = _client
        .channel('typing:$rideId')
        .onBroadcast(
          event: 'typing',
          callback: (payload) {
            final senderId = payload['sender_id'] as String?;
            if (senderId != null) {
              controller.add(senderId);
              nullTimer?.cancel();
              nullTimer = Timer(const Duration(seconds: 3), () {
                if (!controller.isClosed) controller.add(null);
              });
            }
          },
        )
        .subscribe();

    controller.onCancel = () {
      nullTimer?.cancel();
      _client.removeChannel(channel);
      controller.close();
    };

    return controller.stream;
  }
}
