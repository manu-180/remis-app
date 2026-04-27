import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:remis_driver/features/chat/data/chat_repository.dart';
import 'package:remis_driver/features/chat/data/message_model.dart';

part 'chat_controller.g.dart';

ChatRepository _repo() => ChatRepository(Supabase.instance.client);

@riverpod
Stream<List<MessageModel>> chatMessages(Ref ref, String rideId) {
  final repo = _repo();
  final currentUserId = Supabase.instance.client.auth.currentUser!.id;

  repo.markAsRead(rideId: rideId, readerId: currentUserId).ignore();

  return repo.watchMessages(rideId);
}

@riverpod
Stream<String?> typingIndicator(Ref ref, String rideId) {
  return _repo().watchTyping(rideId);
}
