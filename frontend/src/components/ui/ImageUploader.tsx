"use client";

import { useState } from "react";
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
  label = "Upload Image",
  aspectRatio = 1,
}: ImageUploaderProps) {
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  useScrollLock(showCropper);
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
    } catch (err) {
      toast.error("Failed to crop image. Please try again.");
    }
  };

  return (
    <>
      <div className="space-y-3">
        <input
          type="file"
          accept="image/*"
          id={`image-upload-${label}`}
          onChange={handleImageUpload}
          className="hidden"
        />

        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 cursor-pointer"
          onClick={() => document.getElementById(`image-upload-${label}`)?.click()}
        >
          <Upload className="h-4 w-4" />
          {label}
        </Button>

        {currentImage && (
        <div className="mt-3 relative">
            <img
            src={currentImage}
            alt="Preview"
            className="w-full h-full object-cover rounded-lg border"
            />

            <button
            type="button"
            onClick={() => onImageChange("")}
            className="cursor-pointer absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full shadow hover:bg-red-700 transition"
            >
            <Trash2 className="w-4 h-4" />
            </button>
        </div>
        )}
      </div>

      {showCropper && imageToCrop && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Adjust your image</h2>

            <div className="relative w-full h-64 bg-gray-200 rounded-xl overflow-hidden mb-4">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={aspectRatio}
                cropShape="rect"
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(croppedArea, croppedPixels) =>
                  setCroppedAreaPixels(croppedPixels)
                }
              />
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Zoom
              </label>
              <input
                type="range"
                title="Zoom"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full cursor-pointer"
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCropper(false);
                  setCrop({ x: 0, y: 0 });
                  setZoom(1);
                }}
                className="flex-1 cursor-pointer"
              >
                Cancel
              </Button>
              <Button type="button" onClick={saveCroppedImage} className="flex-1 cursor-pointer">
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}