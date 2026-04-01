export interface UnreadMessagePreviewLabels {
  ownPrefix: string;
  photo: string;
  file: string;
  voiceMessage: string;
  fallbackSenderName: string;
  formatVoiceFromOther: (name: string) => string;
}

export function formatUnreadMessagePreview(
  content: string,
  options: {
    isOwnMessage: boolean;
    senderName?: string;
    labels: UnreadMessagePreviewLabels;
  }
): string {
  const { isOwnMessage, senderName, labels } = options;

  if (content.includes('[AUDIO:')) {
    if (isOwnMessage) {
      return `${labels.ownPrefix}${labels.voiceMessage}`;
    }

    return labels.formatVoiceFromOther(senderName || labels.fallbackSenderName);
  }

  if (content.includes('[FILE:')) {
    const match = content.match(/\[FILE:(.*?)\]/);
    const fileUrl = match ? match[1] : '';
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl);
    const label = isImage ? labels.photo : labels.file;
    return isOwnMessage ? `${labels.ownPrefix}${label}` : label;
  }

  return isOwnMessage ? `${labels.ownPrefix}${content}` : content;
}