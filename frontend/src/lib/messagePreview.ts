export interface UnreadMessagePreviewLabels {
  ownPrefix: string;
  photo: string;
  file: string;
  voiceMessage: string;
  deleted: string;
  fallbackSenderName: string;
  formatVoiceFromOther: (name: string) => string;
}

export function formatUnreadMessagePreview(
  content: string,
  options: {
    isOwnMessage: boolean;
    senderName?: string;
    deletedAt?: string | null;
    labels: UnreadMessagePreviewLabels;
  }
): string {
  const { isOwnMessage, senderName, deletedAt, labels } = options;

  if (deletedAt) {
    return isOwnMessage ? `${labels.ownPrefix}${labels.deleted}` : labels.deleted;
  }

  if (content.includes('[AUDIO:')) {
    if (isOwnMessage) {
      return `${labels.ownPrefix}${labels.voiceMessage}`;
    }

    return labels.formatVoiceFromOther(senderName || labels.fallbackSenderName);
  }

  if (content.includes('[FILE:')) {
    const label = isImageAttachmentContent(content) ? labels.photo : labels.file;
    return isOwnMessage ? `${labels.ownPrefix}${label}` : label;
  }

  return isOwnMessage ? `${labels.ownPrefix}${content}` : content;
}

/** True when a chat [FILE:…] payload points at an image (handles query strings / truncation). */
export function isImageAttachmentContent(content: string): boolean {
  const match = content.match(/\[FILE:([^\]]*)/);
  const fileUrl = match?.[1] ?? content;
  return /\.(jpg|jpeg|png|gif|webp)/i.test(fileUrl);
}

/** Short label for notification / email previews of chat attachments. */
export function formatAttachmentNotificationPreview(
  content: string,
  labels: Pick<UnreadMessagePreviewLabels, "photo" | "file" | "voiceMessage">
): string | null {
  if (content.includes("[AUDIO:")) return labels.voiceMessage;
  if (content.includes("[FILE:")) {
    return isImageAttachmentContent(content) ? labels.photo : labels.file;
  }
  return null;
}