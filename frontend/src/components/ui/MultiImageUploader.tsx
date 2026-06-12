"use client";

import { useState, useRef } from "react";
import { Upload, Trash2, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppImage from "@/components/ui/AppImage";
import type { Area } from "react-easy-crop";
import ImageCropModal from "@/components/ui/ImageCropModal";
import getCroppedImg from "@/utils/cropImage";
import { toast } from "sonner";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useTranslation } from "react-i18next";

const MAX_IMAGES = 5;

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
  aspectRatio?: number;
}

export default function MultiImageUploader({ images, onChange, aspectRatio = 16 / 9 }: Props) {
  const { t } = useTranslation();
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useScrollLock(previewIndex !== null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (e.target) e.target.value = "";

    if (!file.type.startsWith("image/")) {
      toast.error(t("post.uploadImageTypeError"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("post.uploadImageSizeError"));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop(reader.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const saveCroppedImage = async (croppedAreaPixels: Area) => {
    if (!imageToCrop) return;
    try {
      const cropped = await getCroppedImg(imageToCrop, croppedAreaPixels);
      onChange([...images, cropped]);
      setShowCropper(false);
      setImageToCrop(null);
    } catch {
      toast.error(t("post.cropImageError"));
    }
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
    if (previewIndex === index) setPreviewIndex(null);
  };

  const setCover = (index: number) => {
    if (index === 0) return;
    const reordered = [...images];
    const [picked] = reordered.splice(index, 1);
    reordered.unshift(picked);
    onChange(reordered);
    setPreviewIndex(0);
  };

  const canAdd = images.length < MAX_IMAGES;

  return (
    <>
      <div className="space-y-3">
        {/* Existing images grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {images.map((src, i) => (
              <div key={i} className="relative aspect-video rounded-lg overflow-hidden border bg-gray-100 group">
                <AppImage
                  src={src}
                  alt={`Photo ${i + 1}`}
                  fill
                  sizes="(max-width: 640px) 50vw, 33vw"
                  className="object-cover cursor-pointer"
                  onClick={() => setPreviewIndex(i)}
                />
                {/* Cover badge on first */}
                {i === 0 && (
                  <span className="absolute bottom-1.5 left-1.5 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded font-medium pointer-events-none">
                    {t("post.coverBadge")}
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                  title={t("common.delete")}
                  aria-label={t("common.delete")}
                  className="cursor-pointer absolute top-1.5 right-1.5 bg-red-600 text-white p-1.5 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add photo button */}
        {canAdd && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              title={t("post.addPhotos")}
              aria-label={t("post.addPhotos")}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 cursor-pointer"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {images.length === 0 ? t("post.addPhotos") : t("post.addMorePhotos", { count: images.length, max: MAX_IMAGES })}
            </Button>
          </>
        )}
        {!canAdd && (
          <p className="text-xs text-gray-400 text-center">{t("post.maxPhotosReached", { max: MAX_IMAGES })}</p>
        )}
      </div>

      {/* Preview modal */}
      {previewIndex !== null && images[previewIndex] && (
        <div className="fixed inset-0 z-100 bg-black/80 flex flex-col items-center justify-center p-4" onClick={() => setPreviewIndex(null)}>
          <div className="relative w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            {/* Close */}
            <button
              type="button"
              aria-label={t("common.close")}
              onClick={() => setPreviewIndex(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Image */}
            <AppImage
              src={images[previewIndex]}
              alt={`Photo ${previewIndex + 1}`}
              width={1200}
              height={800}
              className="w-full rounded-xl object-contain max-h-[65vh]"
            />

            {/* Actions */}
            <div className="flex gap-3 mt-3">
              {previewIndex !== 0 && (
                <button
                  type="button"
                  onClick={() => setCover(previewIndex)}
                  className="cursor-pointer flex-1 flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                >
                  <Star className="h-4 w-4" />
                  {t("post.setCoverImage")}
                </button>
              )}
              {previewIndex === 0 && (
                <div className="flex-1 flex items-center justify-center gap-2 bg-green-100 text-green-800 text-sm font-semibold py-2.5 rounded-xl">
                  <Star className="h-4 w-4 fill-green-600 text-green-600" />
                  {t("post.coverImageLabel")}
                </div>
              )}
              <button
                type="button"
                aria-label={t("common.delete")}
                onClick={() => { removeImage(previewIndex); }}
                className="cursor-pointer flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showCropper && imageToCrop && (
        <ImageCropModal
          image={imageToCrop}
          aspect={aspectRatio}
          title={t("post.adjustImage")}
          saveLabel={t("post.saveImage")}
          onCancel={() => {
            setShowCropper(false);
            setImageToCrop(null);
          }}
          onSave={saveCroppedImage}
        />
      )}
    </>
  );
}
