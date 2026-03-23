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
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
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
    reader.onload = () => {
      setRawImage(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const confirmCrop = async () => {
    if (!rawImage || !croppedAreaPixels) return;
    const cropped = await getCroppedImg(rawImage, croppedAreaPixels);
    setImage(cropped);
    setShowCropper(false);
    setRawImage(null);
  };

  const handleSave = async () => {
    if (!title.trim() || !image) {
      setError(true);
      return;
    }

    onSave({ image, title, description });

    setImage(null);
    setRawImage(null);
    setTitle("");
    setDescription("");
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setCroppedAreaPixels(null);
    setError(false);
    setShowCropper(false);

    onClose();
  };

  return (
    <>
      {/* Form modal */}
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4">Add Portfolio Item</h2>

          {/* Image preview or upload zone */}
          {!image ? (
            <label className="w-full h-40 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-50 mb-4">
              <span className="text-gray-600">Cliquer pour télécharger une image</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          ) : (
            <div className="relative mb-4">
              <div className="w-full aspect-4/3 rounded-xl overflow-hidden bg-gray-100">
                <img src={image} alt="preview" className="w-full h-full object-cover" />
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl cursor-pointer opacity-0 hover:opacity-100 transition-opacity">
                <span className="text-white text-sm font-medium">Changer l'image</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
          )}

          <div className="space-y-2 mb-4">
            <Label>Titre *</Label>
            <Input
              value={title}
              onChange={(e) => { setTitle(e.target.value); if (error) setError(false); }}
              placeholder="ex: Rénovation salle de bain"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            {error && <p className="text-red-500 text-sm">Le titre est requis.</p>}
          </div>

          <div className="space-y-2 mb-6">
            <Label>Description (optionnelle)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Courte description..." />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 cursor-pointer" onClick={onClose}>Annuler</Button>
            <Button className="flex-1 bg-green-700 hover:bg-green-800 text-white cursor-pointer" onClick={handleSave}>
              Ajouter au portfolio
            </Button>
          </div>
        </div>
      </div>

      {/* Full-screen cropper — overlays form modal */}
      {showCropper && rawImage && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="shrink-0 flex items-center justify-between px-5 py-4 bg-black/80">
            <h3 className="text-white font-semibold text-base">Ajuster l'image</h3>
            <button type="button" onClick={() => { setShowCropper(false); setRawImage(null); }}
              className="text-white/70 hover:text-white text-sm cursor-pointer px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
              Annuler
            </button>
          </div>
          <div className="relative flex-1 bg-gray-900">
            <Cropper image={rawImage} crop={crop} zoom={zoom} aspect={4 / 3} showGrid={true}
              onCropChange={setCrop} onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)} />
          </div>
          <div className="shrink-0 bg-black/90 px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/70 text-sm font-medium">Zoom</span>
              <span className="text-white/50 text-xs tabular-nums">{Math.round((zoom - 1) / 2 * 100)}%</span>
            </div>
            <div className="flex items-center gap-3 mb-5">
              <button type="button" onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white text-lg flex items-center justify-center shrink-0 cursor-pointer select-none">−</button>
              <input type="range" title="Zoom" min={1} max={3} step={0.05} value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 h-1.5 rounded-full cursor-pointer accent-green-500" />
              <button type="button" onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white text-lg flex items-center justify-center shrink-0 cursor-pointer select-none">+</button>
            </div>
            <Button type="button" onClick={confirmCrop}
              className="w-full bg-green-700 hover:bg-green-800 text-white h-12 text-base font-semibold rounded-xl cursor-pointer">
              Confirmer
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
