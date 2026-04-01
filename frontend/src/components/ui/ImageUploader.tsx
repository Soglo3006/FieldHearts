"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Upload, Trash2 } from "lucide-react";
import Cropper, { type Area } from "react-easy-crop";
import getCroppedImg from "@/utils/cropImage";
import { toast } from "sonner";
import { useScrollLock } from "@/hooks/useScrollLock";

interface ImageUploaderProps {
  currentImage: string | null;
  onImageChange: (newImage: string) => void;
  label?: string;
  aspectRatio?: number;
}

export default function ImageUploader({
  currentImage,
  onImageChange,
  label,
  aspectRatio = 16 / 9,
}: ImageUploaderProps) {
  const { t } = useTranslation();
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  useScrollLock(showCropper);
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const resolvedLabel = label ?? t('common.uploadImage');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t('post.uploadImageTypeError'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('post.uploadImageSizeError'));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop(reader.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const saveCroppedImage = async () => {
    if (!croppedAreaPixels) return;
    try {
      const croppedImage = await getCroppedImg(imageToCrop!, croppedAreaPixels);
      onImageChange(croppedImage);
      setShowCropper(false);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    } catch {
      toast.error(t('post.cropImageError'));
    }
  };

  return (
    <>
      <div className="space-y-3">
        <input
          type="file"
          accept="image/*"
          id={`image-upload-${resolvedLabel}`}
          onChange={handleImageUpload}
          title={resolvedLabel}
          aria-label={resolvedLabel}
          className="hidden"
        />

        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 cursor-pointer"
          onClick={() => document.getElementById(`image-upload-${resolvedLabel}`)?.click()}
        >
          <Upload className="h-4 w-4" />
          {resolvedLabel}
        </Button>

        {currentImage && (
        <div className="mt-3 relative aspect-video rounded-lg overflow-hidden border bg-gray-100">
            <img
            src={currentImage}
            alt={t('common.preview')}
            className="w-full h-full object-cover"
            />

            <button
            type="button"
            onClick={() => onImageChange("")}
            title={t('common.remove')}
            aria-label={t('common.remove')}
            className="cursor-pointer absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full shadow hover:bg-red-700 transition"
            >
            <Trash2 className="w-4 h-4" />
            </button>
        </div>
        )}
      </div>

      {showCropper && imageToCrop && (
        <div className="fixed inset-0 z-100 bg-black flex flex-col">
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-5 py-4 bg-black/80">
            <h2 className="text-white font-semibold text-base">{t('post.adjustImage')}</h2>
            <button
              type="button"
              onClick={() => { setShowCropper(false); setCrop({ x: 0, y: 0 }); setZoom(1); }}
              className="text-white/70 hover:text-white text-sm cursor-pointer px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>

          {/* Crop area */}
          <div className="relative flex-1 bg-gray-900">
            <Cropper
              image={imageToCrop}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatio}
              cropShape="rect"
              showGrid={true}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
            />
          </div>

          {/* Controls */}
          <div className="shrink-0 bg-black/90 px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/70 text-sm font-medium">{t('profile.zoom')}</span>
              <span className="text-white/50 text-xs tabular-nums">{Math.round((zoom - 1) / 2 * 100)}%</span>
            </div>
            <div className="flex items-center gap-3 mb-5">
              <button type="button" onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white text-lg flex items-center justify-center shrink-0 cursor-pointer select-none">−</button>
              <input type="range" title={t('profile.zoom')} min={1} max={3} step={0.05}
                value={zoom} onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 h-1.5 rounded-full cursor-pointer accent-green-500" />
              <button type="button" onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white text-lg flex items-center justify-center shrink-0 cursor-pointer select-none">+</button>
            </div>
            <Button
              type="button"
              onClick={saveCroppedImage}
              className="w-full bg-green-700 hover:bg-green-800 text-white h-12 text-base font-semibold rounded-xl cursor-pointer"
            >
              {t('common.save')}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}