import { Area } from "react-easy-crop";

const MAX_WIDTH = 1200;
const QUALITY = 0.82;

export default function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
  const image = new Image();
  image.src = imageSrc;

  return new Promise((resolve) => {
    image.onload = () => {
      // Scale down if the crop area exceeds MAX_WIDTH
      const scale = pixelCrop.width > MAX_WIDTH ? MAX_WIDTH / pixelCrop.width : 1;
      const outputWidth = Math.round(pixelCrop.width * scale);
      const outputHeight = Math.round(pixelCrop.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outputHeight;

      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        outputWidth,
        outputHeight
      );

      // Use WebP when supported (all modern browsers except older Safari), fall back to JPEG
      const webpTest = canvas.toDataURL("image/webp");
      const mimeType = webpTest.startsWith("data:image/webp") ? "image/webp" : "image/jpeg";

      resolve(canvas.toDataURL(mimeType, QUALITY));
    };
  });
}
