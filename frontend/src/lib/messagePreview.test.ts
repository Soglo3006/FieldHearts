import { describe, expect, it } from 'vitest';
import { formatUnreadMessagePreview } from './messagePreview';

const labels = {
  ownPrefix: 'Vous: ',
  photo: 'Photo',
  file: 'Fichier',
  voiceMessage: 'Message vocal',
  deleted: 'Ce message a ete supprime',
  fallbackSenderName: 'Quelqu’un',
  formatVoiceFromOther: (name: string) => `${name} a envoyé un message vocal`,
};

describe('formatUnreadMessagePreview', () => {
  it('formats a photo attachment preview', () => {
    expect(
      formatUnreadMessagePreview('[FILE:https://cdn.example.com/photo.webp]', {
        isOwnMessage: false,
        labels,
      })
    ).toBe('Photo');
  });

  it('formats a generic file attachment preview', () => {
    expect(
      formatUnreadMessagePreview('[FILE:https://cdn.example.com/file.pdf]', {
        isOwnMessage: true,
        labels,
      })
    ).toBe('Vous: Fichier');
  });

  it('formats a voice message preview', () => {
    expect(
      formatUnreadMessagePreview('[AUDIO:https://cdn.example.com/voice.webm:12]', {
        isOwnMessage: false,
        senderName: 'Alex',
        labels,
      })
    ).toBe('Alex a envoyé un message vocal');
  });

  it('formats a deleted message preview', () => {
    expect(
      formatUnreadMessagePreview('Original content', {
        isOwnMessage: true,
        deletedAt: '2026-04-01T12:00:00.000Z',
        labels,
      })
    ).toBe('Vous: Ce message a ete supprime');
  });
});