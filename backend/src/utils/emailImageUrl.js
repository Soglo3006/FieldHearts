const EMAIL_LISTING_CID = "listing-image";

export function pickListingImageUrl(imageUrl, imageUrls) {
  const candidates = [];
  if (Array.isArray(imageUrls)) {
    for (const url of imageUrls) {
      if (typeof url === "string" && url.trim()) candidates.push(url.trim());
    }
  }
  if (typeof imageUrl === "string" && imageUrl.trim()) {
    candidates.push(imageUrl.trim());
  }
  return candidates[0] ?? null;
}

function parseDataImage(dataUrl) {
  const match = /^data:(image\/[a-z0-9+.-]+);base64,([a-z0-9+/=\s]+)$/i.exec(dataUrl);
  if (!match) return null;
  return { mime: match[1], base64: match[2].replace(/\s/g, "") };
}

function httpImageForEmail(url) {
  if (!/^https?:\/\//i.test(url)) return null;
  return url.replace("/storage/v1/render/image/public/", "/storage/v1/object/public/");
}

/**
 * Email clients cannot load data: URLs in <img>. Use HTTPS URLs or inline CID attachments.
 */
export function prepareEmailListingImage(imageUrl, imageUrls) {
  const raw = pickListingImageUrl(imageUrl, imageUrls);
  if (!raw) return { src: null, attachments: [] };

  const http = httpImageForEmail(raw);
  if (http) return { src: http, attachments: [] };

  const data = parseDataImage(raw);
  if (!data) return { src: null, attachments: [] };

  const ext = data.mime.includes("png")
    ? "png"
    : data.mime.includes("webp")
      ? "webp"
      : "jpg";

  return {
    src: `cid:${EMAIL_LISTING_CID}`,
    attachments: [
      {
        filename: `listing.${ext}`,
        content: data.base64,
        contentId: EMAIL_LISTING_CID,
        contentType: data.mime,
      },
    ],
  };
}
