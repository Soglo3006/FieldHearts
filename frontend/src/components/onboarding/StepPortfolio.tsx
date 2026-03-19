"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ImageIcon } from "lucide-react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import getCroppedImg from "@/utils/cropImage";
import { PortfolioItem } from "./onboardingTypes";
import { toast } from "sonner";
import { useScrollLock } from "@/hooks/useScrollLock";

interface Props {
  portfolio: PortfolioItem[];
  onAdd: (item: PortfolioItem) => void;
  onRemove: (id: number) => void;
  onUpdate: (id: number, field: keyof PortfolioItem, value: string) => void;
}

export default function StepPortfolio({ portfolio, onAdd, onRemove, onUpdate }: Props) {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  useScrollLock(showModal);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedPixels, setCroppedPixels] = useState<Area | null>(null);
  const [error, setError] = useState(false);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file."); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setTitle("");
      setShowModal(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!image || !title.trim() || !croppedPixels) { setError(true); return; }
    try {
      const cropped = await getCroppedImg(image, croppedPixels);
      onAdd({ id: portfolio.length + 1, image: cropped, title: title.trim(), description: "" });
      closeModal();
    } catch {
      toast.error("Failed to crop image.");
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setImage(null);
    setTitle("");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedPixels(null);
    setError(false);
  };

  return (
    <>
      <Card className="p-6 sm:p-8 animate-in fade-in duration-300">
        <h2 className="text-xl font-bold text-gray-900">{t("onboarding.portfolio")}</h2>
        <p className="text-gray-600">{t("onboarding.portfolioSubtitle")}</p>

        <div className="space-y-6">
          {portfolio.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-4">
              {portfolio.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="relative aspect-square bg-gray-100">
                    <img src={item.image} alt={item.title || "Portfolio item"} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      title="Remove portfolio item"
                      onClick={() => onRemove(item.id)}
                      className="cursor-pointer absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="p-4">
                    <Input
                      placeholder={t("onboarding.photoTitle")}
                      value={item.title}
                      onChange={(e) => onUpdate(item.id, "title", e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {portfolio.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
              <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No portfolio items yet</p>
            </div>
          )}

          <Button variant="outline" onClick={() => document.getElementById("portfolioInput")?.click()} className="w-full gap-2 cursor-pointer">
            <Plus className="h-4 w-4" /> {t("onboarding.addPhoto")}
          </Button>
          <input type="file" accept="image/*" id="portfolioInput" aria-label="Upload portfolio image" className="hidden" onChange={handleUpload} />
        </div>
      </Card>

      {showModal && image && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-3xl">
            <h2 className="text-xl font-semibold mb-4">{t("onboarding.addPhoto")}</h2>
            <div className="relative w-full h-80 bg-gray-200 rounded-lg overflow-hidden mb-4">
              <Cropper
                image={image}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={(_, pixels) => setCroppedPixels(pixels)}
                onZoomChange={setZoom}
              />
            </div>
            <div className="space-y-2 mb-6">
              <Label>{t("onboarding.photoTitle")} <span className="text-red-500">*</span></Label>
              <Input value={title} onChange={(e) => { setTitle(e.target.value); if (error) setError(false); }} />
              {error && <p className="text-xs text-red-500">Please enter a title.</p>}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={closeModal} className="flex-1">{t("common.cancel")}</Button>
              <Button onClick={handleSave} disabled={!title.trim()} className="flex-1 bg-green-600 text-white">{t("onboarding.addPhoto")}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
