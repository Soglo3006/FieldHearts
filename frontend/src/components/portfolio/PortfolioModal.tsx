"use client";

import { useState } from "react";
import { useScrollLock } from "@/hooks/useScrollLock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import getCroppedImg from "@/utils/cropImage";

interface PortfolioModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (item: { image: string; title: string; description: string }) => void;
}

export default function PortfolioModal({ open, onClose, onSave }: PortfolioModalProps) {
  useScrollLock(true);
  const [image, setImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState(false);

  if (!open) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!title.trim() || !croppedAreaPixels) {
      setError(true);
      return;
    }

    const croppedImg = await getCroppedImg(image!, croppedAreaPixels);
    onSave({
      image: croppedImg,
      title,
      description,
    });

    setImage(null);
    setTitle("");
    setDescription("");
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setCroppedAreaPixels(null);
    setError(false);

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Add Portfolio Item</h2>

        {!image && (
          <label className="w-full h-40 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-50">
            <span className="text-gray-600">Click to upload image</span>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
        )}

        {image && (
          <>
            <div className="relative w-full h-80 bg-gray-100 rounded-xl overflow-hidden mb-4">
              <Cropper
                image={image}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
              />
            </div>

            <Label className="text-sm font-medium">Zoom</Label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full mb-4"
            />
          </>
        )}

        <div className="space-y-2 mb-4">
          <Label>Title *</Label>
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError(false);
            }}
            placeholder="e.g., Bathroom Renovation"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          {error && <p className="text-red-500 text-sm">Title is required.</p>}
        </div>

        <div className="space-y-2 mb-6">
          <Label>Description (optional)</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description..."
          />
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1 bg-green-600 text-white" onClick={handleSave}>
            Add to Portfolio
          </Button>
        </div>
      </div>
    </div>
  );
}
