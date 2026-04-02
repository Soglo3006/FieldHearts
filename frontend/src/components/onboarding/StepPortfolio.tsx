"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ImageIcon } from "lucide-react";
import AppImage from "@/components/ui/AppImage";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import getCroppedImg from "@/utils/cropImage";
import { PortfolioItem } from "./onboardingTypes";
import { toast } from "sonner";
import { useScrollLock } from "@/hooks/useScrollLock";

interface Props {
  portfolio: PortfolioItem[];
  accountType: "person" | "company";
  onAdd: (item: PortfolioItem) => void;
  onRemove: (id: number) => void;
  onUpdate: (id: number, field: keyof PortfolioItem, value: string) => void;
}

export default function StepPortfolio({ portfolio, accountType, onAdd, onRemove, onUpdate }: Props) {
  const { t } = useTranslation();
  const isCompany = accountType === "company";
  const [showCropper, setShowCropper] = useState(false);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  useScrollLock(showCropper);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedPixels, setCroppedPixels] = useState<Area | null>(null);
  const [error, setError] = useState(false);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error(t('onboarding.invalidImageFile')); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      setRawImage(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedPixels(null);
      setTitle("");
      setError(false);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!rawImage || !title.trim() || !croppedPixels) { setError(true); return; }
    try {
      const cropped = await getCroppedImg(rawImage, croppedPixels);
      onAdd({ id: portfolio.length + 1, image: cropped, title: title.trim(), description: "" });
      closeModal();
    } catch {
      toast.error(t('onboarding.cropImageFailed'));
    }
  };

  const closeModal = () => {
    setShowCropper(false);
    setRawImage(null);
    setTitle("");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedPixels(null);
    setError(false);
  };

  return (
    <>
      <Card className="p-6 sm:p-8 animate-in fade-in duration-300">
        <h2 className="text-xl font-bold text-gray-900">{isCompany ? t("onboarding.companyProjectsTitle") : t("onboarding.portfolio")}</h2>
        <p className="text-gray-600">{isCompany ? t("onboarding.companyProjectsSubtitle") : t("onboarding.portfolioSubtitle")}</p>

        <div className="space-y-6">
          {portfolio.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-4">
              {portfolio.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="relative aspect-4/3 bg-gray-100">
                    <AppImage src={item.image} alt={item.title || t('onboarding.portfolioItemAlt')} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" />
                    <button
                      type="button"
                      title={t('onboarding.removePortfolioItem')}
                      aria-label={t('onboarding.removePortfolioItem')}
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
              <p className="text-gray-500 mb-4">{isCompany ? t('onboarding.noProjects') : t('onboarding.noPortfolio')}</p>
            </div>
          )}

          <Button variant="outline" onClick={() => document.getElementById("portfolioInput")?.click()} className="w-full gap-2 cursor-pointer">
            <Plus className="h-4 w-4" /> {t("onboarding.addPhoto")}
          </Button>
          <input type="file" accept="image/*" id="portfolioInput" title={isCompany ? t('onboarding.uploadProjectImage') : t('onboarding.uploadPortfolioImage')} aria-label={isCompany ? t('onboarding.uploadProjectImage') : t('onboarding.uploadPortfolioImage')} className="hidden" onChange={handleUpload} />
        </div>
      </Card>

      {showCropper && rawImage && (
        <div className="fixed inset-0 z-100 bg-black flex flex-col">
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-5 py-4 bg-black/80">
            <h3 className="text-white font-semibold text-base">{t("onboarding.addPhoto")}</h3>
            <button
              type="button"
              onClick={closeModal}
              className="text-white/70 hover:text-white text-sm cursor-pointer px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              {t("common.cancel")}
            </button>
          </div>

          {/* Crop area */}
          <div className="relative flex-1 bg-gray-900">
            <Cropper
              image={rawImage}
              crop={crop}
              zoom={zoom}
              aspect={4 / 3}
              showGrid={true}
              onCropChange={setCrop}
              onCropComplete={(_, pixels) => setCroppedPixels(pixels)}
              onZoomChange={setZoom}
            />
          </div>

          {/* Controls */}
          <div className="shrink-0 bg-black/90 px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/70 text-sm font-medium">{t("profile.zoom")}</span>
              <span className="text-white/50 text-xs tabular-nums">{Math.round((zoom - 1) / 2 * 100)}%</span>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <button type="button" onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white text-lg flex items-center justify-center shrink-0 cursor-pointer select-none">−</button>
              <input type="range" title={t('profile.zoom')} min={1} max={3} step={0.05}
                value={zoom} onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 h-1.5 rounded-full cursor-pointer accent-green-500" />
              <button type="button" onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white text-lg flex items-center justify-center shrink-0 cursor-pointer select-none">+</button>
            </div>

            {/* Title input */}
            <div className="mb-4">
              <Input
                type="text"
                placeholder={t("onboarding.photoTitle")}
                value={title}
                onChange={(e) => { setTitle(e.target.value); setError(false); }}
                className={`bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-green-500 ${error ? "border-red-500" : ""}`}
              />
              {error && <p className="text-xs text-red-400 mt-1">{t('onboarding.titleRequired')}</p>}
            </div>

            <Button
              type="button"
              onClick={handleSave}
              className="w-full bg-green-700 hover:bg-green-800 text-white h-12 text-base font-semibold rounded-xl cursor-pointer"
            >
              {t("onboarding.addPhoto")}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
