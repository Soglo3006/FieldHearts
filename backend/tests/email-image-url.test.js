import { describe, expect, it } from "vitest";
import { pickListingImageUrl, prepareEmailListingImage } from "../src/utils/emailImageUrl.js";

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("email listing images", () => {
  it("prefers image_urls over legacy image_url", () => {
    expect(
      pickListingImageUrl("legacy.jpg", ["https://cdn.example.com/first.jpg"]),
    ).toBe("https://cdn.example.com/first.jpg");
  });

  it("uses inline attachment for data URLs", () => {
    const { src, attachments } = prepareEmailListingImage(null, [TINY_PNG]);
    expect(src).toBe("cid:listing-image");
    expect(attachments).toHaveLength(1);
    expect(attachments[0].contentId).toBe("listing-image");
    expect(attachments[0].contentType).toBe("image/png");
  });

  it("normalizes supabase render URLs to public object URLs", () => {
    const url =
      "https://abc.supabase.co/storage/v1/render/image/public/bucket/file.jpg?width=800";
    const { src, attachments } = prepareEmailListingImage(url, null);
    expect(src).toBe("https://abc.supabase.co/storage/v1/object/public/bucket/file.jpg?width=800");
    expect(attachments).toHaveLength(0);
  });
});
