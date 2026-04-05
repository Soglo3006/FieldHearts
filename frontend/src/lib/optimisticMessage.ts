interface UserLike {
  id: string;
}

interface OptimisticReplyTarget {
  id: string;
  content: string;
  user_id: string;
  sender?: {
    full_name?: string;
  } | null;
}

export interface OptimisticMessageLike {
  id: string;
  client_temp_id?: string;
  chat_room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  replied_to_message_id?: string | null;
  status?: 'sending' | 'sent' | 'failed';
  replied_to?: {
    id: string;
    content: string;
    user_id: string;
    sender_name?: string;
  } | null;
}

interface SendOptimisticMessageOptions<TMessage extends OptimisticMessageLike> {
  chatRoomId: string | null;
  content: string;
  repliedToMessageId?: string | null;
  overrideChatRoomId?: string | null;
  user: UserLike | null | undefined;
  existingMessages: TMessage[];
  setMessages: (updater: (prev: TMessage[]) => TMessage[]) => void;
  cacheMessages: (chatId: string, messages: TMessage[]) => void;
  setSending: (sending: boolean) => void;
  insertMessage: (payload: {
    chat_room_id: string;
    user_id: string;
    content: string;
    client_temp_id: string;
    replied_to_message_id: string | null;
  }) => Promise<void>;
  restoreConversation: (chatId: string, userId: string) => Promise<void>;
  notifyMessage: (payload: {
    chatRoomId: string;
    messagePreview: string;
  }) => void;
  makeTempId?: () => string;
  now?: () => string;
}

export async function sendOptimisticMessage<TMessage extends OptimisticMessageLike>({
  chatRoomId,
  content,
  repliedToMessageId,
  overrideChatRoomId,
  user,
  existingMessages,
  setMessages,
  cacheMessages,
  setSending,
  insertMessage,
  restoreConversation,
  notifyMessage,
  makeTempId = () => `temp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  now = () => new Date().toISOString(),
}: SendOptimisticMessageOptions<TMessage>): Promise<void> {
  const targetChatRoomId = overrideChatRoomId || chatRoomId;
  if (!content.trim() || !targetChatRoomId || !user) return;

  const trimmed = content.trim();
  const tempId = makeTempId();
  const nowIso = now();
  const replyTarget = repliedToMessageId
    ? existingMessages.find((message) => message.id === repliedToMessageId)
    : null;

  const optimistic = {
    id: tempId,
    client_temp_id: tempId,
    chat_room_id: targetChatRoomId,
    user_id: user.id,
    content: trimmed,
    created_at: nowIso,
    replied_to_message_id: repliedToMessageId || null,
    status: 'sending' as const,
    replied_to: replyTarget
      ? {
          id: replyTarget.id,
          content: replyTarget.content,
          user_id: replyTarget.user_id,
          sender_name: (replyTarget as OptimisticReplyTarget).sender?.full_name,
        }
      : null,
  } as TMessage;

  setMessages((prev) => {
    const next = [...prev, optimistic];
    cacheMessages(targetChatRoomId, next);
    return next;
  });

  setSending(true);

  try {
    await insertMessage({
      chat_room_id: targetChatRoomId,
      user_id: user.id,
      content: trimmed,
      client_temp_id: tempId,
      replied_to_message_id: repliedToMessageId || null,
    });

    await restoreConversation(targetChatRoomId, user.id);

    notifyMessage({
      chatRoomId: targetChatRoomId,
      messagePreview: trimmed.substring(0, 100),
    });
  } catch (error) {
    setMessages((prev) => {
      const next = prev.map((message) => (message.id === tempId ? { ...message, status: 'failed' as const } : message));
      cacheMessages(targetChatRoomId, next);
      return next;
    });
    throw error instanceof Error ? error : new Error('Failed to send message');
  } finally {
    setSending(false);
  }
}