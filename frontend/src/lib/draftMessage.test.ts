import { describe, expect, it, vi } from 'vitest';
import { DraftMessagePreparationError, prepareDraftMessageTarget } from './draftMessage';

describe('prepareDraftMessageTarget', () => {
  it('does not create a chat when attachment upload fails', async () => {
    const ensureChat = vi.fn().mockResolvedValue('chat-123');
    const removeUploadedAttachment = vi.fn();

    await expect(
      prepareDraftMessageTarget({
        attachment: { name: 'photo.png' },
        createUploadPath: () => 'user/123.png',
        uploadAttachment: vi.fn().mockRejectedValue(new Error('upload failed')),
        ensureChat,
        removeUploadedAttachment,
      })
    ).rejects.toMatchObject<DraftMessagePreparationError>({ code: 'upload' });

    expect(ensureChat).not.toHaveBeenCalled();
    expect(removeUploadedAttachment).not.toHaveBeenCalled();
  });

  it('cleans up the uploaded file when chat resolution fails', async () => {
    const removeUploadedAttachment = vi.fn().mockResolvedValue(undefined);

    await expect(
      prepareDraftMessageTarget({
        attachment: { name: 'voice.webm' },
        createUploadPath: () => 'user/voice.webm',
        uploadAttachment: vi.fn().mockResolvedValue('https://cdn.example.com/voice.webm'),
        ensureChat: vi.fn().mockResolvedValue(null),
        removeUploadedAttachment,
      })
    ).rejects.toMatchObject<DraftMessagePreparationError>({ code: 'chat' });

    expect(removeUploadedAttachment).toHaveBeenCalledWith('user/voice.webm');
  });
});