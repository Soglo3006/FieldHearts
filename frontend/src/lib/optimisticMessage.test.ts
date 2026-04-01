import { describe, expect, it, vi } from 'vitest';
import { sendOptimisticMessage, type OptimisticMessageLike } from './optimisticMessage';

describe('sendOptimisticMessage', () => {
  it('rethrows after marking the optimistic message as failed', async () => {
    let messages: OptimisticMessageLike[] = [];
    let sending = false;
    const cacheMessages = vi.fn();

    const setMessages = (updater: (prev: OptimisticMessageLike[]) => OptimisticMessageLike[]) => {
      messages = updater(messages);
    };

    const setSending = (value: boolean) => {
      sending = value;
    };

    await expect(
      sendOptimisticMessage({
        chatRoomId: 'chat-1',
        content: 'Bonjour',
        user: { id: 'user-1' },
        existingMessages: messages,
        setMessages,
        cacheMessages,
        setSending,
        insertMessage: vi.fn().mockRejectedValue(new Error('insert failed')),
        restoreConversation: vi.fn(),
        notifyMessage: vi.fn(),
        makeTempId: () => 'temp-1',
        now: () => '2026-04-01T00:00:00.000Z',
      })
    ).rejects.toThrow('insert failed');

    expect(messages).toHaveLength(1);
    expect(messages[0].status).toBe('failed');
    expect(cacheMessages).toHaveBeenLastCalledWith('chat-1', messages);
    expect(sending).toBe(false);
  });
});