export type DisputeAttachment = {
  url: string;
  name: string;
};

export async function uploadDisputeAttachments({
  disputeId,
  files,
  accessToken,
}: {
  disputeId: string;
  files: File[];
  accessToken: string;
}): Promise<DisputeAttachment[]> {
  if (files.length === 0) {
    return [];
  }

  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/disputes/${disputeId}/attachments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.message || "Failed to upload dispute attachments.");
  }

  return Array.isArray(payload.attachments) ? payload.attachments : [];
}