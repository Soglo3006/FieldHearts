"use client";

import { useState, useRef } from "react";
import { Upload, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import Cropper, { type Area } from "react-easy-crop";
import getCroppedImg from "@/utils/cropImage";
import { toast } from "sonner";
import { useScrollLock } from "@/hooks/useScrollLock";

const MAX_IMAGES = 5;

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
  aspectRatio?: number;
}

export default function MultiImageUploader({ images, onChange, aspectRatio = 16 / 9 }: Props) {
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useScrollLock(showCropper);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (e.target) e.target.value = "";

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const saveCroppedImage = async () => {
    if (!croppedAreaPixels || !imageToCrop) return;
    try {
      const cropped = await getCroppedImg(imageToCrop, croppedAreaPixels);
      onChange([...images, cropped]);
      setShowCropper(false);
    } catch {
      toast.error("Failed to crop image. Please try again.");
    }
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
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
                <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                {/* Cover badge on first */}
                {i === 0 && (
                  <span className="absolute bottom-1.5 left-1.5 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded font-medium">
                    Couverture
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(i)}
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
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 cursor-pointer"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {images.length === 0 ? "Ajouter des photos" : `Ajouter une photo (${images.length}/${MAX_IMAGES})`}
            </Button>
          </>
        )}
        {!canAdd && (
          <p className="text-xs text-gray-400 text-center">{MAX_IMAGES} photos maximum atteint</p>
        )}
      </div>

      {/* Cropper modal */}
      {showCropper && imageToCrop && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="shrink-0 flex items-center justify-between px-5 py-4 bg-black/80">
            <h2 className="text-white font-semibold text-base">Ajuster l'image</h2>
            <button
              type="button"
              onClick={() => setShowCropper(false)}
              className="text-white/70 hover:text-white text-sm cursor-pointer px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              Annuler
            </button>
          </div>

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
              onCropComplete={(_, px) => setCroppedAreaPixels(px)}
            />
          </div>

          <div className="shrink-0 bg-black/90 px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/70 text-sm font-medium">Zoom</span>
              <span className="text-white/50 text-xs tabular-nums">{Math.round((zoom - 1) / 2 * 100)}%</span>
            </div>
            <div className="flex items-center gap-3 mb-5">
              <button type="button" onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white text-lg flex items-center justify-center shrink-0 cursor-pointer select-none">−</button>
              <input type="range" title="Zoom" min={1} max={3} step={0.05}
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
              Sauvegarder
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
