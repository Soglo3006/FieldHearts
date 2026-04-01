export class DraftMessagePreparationError extends Error {
  code: 'upload' | 'chat';

  constructor(code: 'upload' | 'chat', message: string) {
    super(message);
    this.code = code;
    this.name = 'DraftMessagePreparationError';
  }
}

interface PrepareDraftMessageTargetOptions<TAttachment> {
  attachment: TAttachment | null;
  createUploadPath?: () => string;
  uploadAttachment?: (uploadPath: string, attachment: TAttachment) => Promise<string>;
  ensureChat: () => Promise<string | null>;
  removeUploadedAttachment?: (uploadPath: string) => Promise<void> | void;
}

export interface PreparedDraftMessageTarget {
  chatId: string;
  fileUrl: string | null;
  uploadedFilePath: string | null;
}

export async function prepareDraftMessageTarget<TAttachment>({
  attachment,
  createUploadPath,
  uploadAttachment,
  ensureChat,
  removeUploadedAttachment,
}: PrepareDraftMessageTargetOptions<TAttachment>): Promise<PreparedDraftMessageTarget> {
  let uploadedFilePath: string | null = null;
  let fileUrl: string | null = null;

  if (attachment) {
    if (!createUploadPath || !uploadAttachment) {
      throw new DraftMessagePreparationError('upload', 'Missing upload configuration');
    }

    uploadedFilePath = createUploadPath();

    try {
      fileUrl = await uploadAttachment(uploadedFilePath, attachment);
    } catch {
      throw new DraftMessagePreparationError('upload', 'Failed to upload attachment');
    }
  }

  const chatId = await ensureChat();
  if (!chatId) {
    if (uploadedFilePath && removeUploadedAttachment) {
      await removeUploadedAttachment(uploadedFilePath);
    }
    throw new DraftMessagePreparationError('chat', 'Failed to resolve chat');
  }

  return { chatId, fileUrl, uploadedFilePath };
}