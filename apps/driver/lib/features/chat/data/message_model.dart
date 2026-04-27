class MessageModel {
  const MessageModel({
    required this.id,
    required this.rideId,
    required this.senderId,
    required this.content,
    required this.createdAt,
    this.readAt,
  });

  final String id;
  final String rideId;
  final String senderId;
  final String content;
  final DateTime createdAt;
  final DateTime? readAt;

  bool get isRead => readAt != null;

  factory MessageModel.fromMap(Map<String, dynamic> map) {
    return MessageModel(
      id: map['id'] as String,
      rideId: map['ride_id'] as String,
      senderId: map['sender_id'] as String,
      content: map['content'] as String,
      createdAt: DateTime.parse(map['created_at'] as String),
      readAt: map['read_at'] != null
          ? DateTime.parse(map['read_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'ride_id': rideId,
      'sender_id': senderId,
      'content': content,
      'created_at': createdAt.toIso8601String(),
      if (readAt != null) 'read_at': readAt!.toIso8601String(),
    };
  }
}
