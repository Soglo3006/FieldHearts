"use client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AppImage from "@/components/ui/AppImage";
import { Upload, Trash2, Camera, Plus, Pencil } from "lucide-react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import getCroppedImg from "@/utils/cropImage";
import { toast } from "sonner";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useTranslation } from "react-i18next";

interface PortfolioItem {
  id: number;
  image: string;
  title: string;
}

interface Props {
  portfolio: PortfolioItem[];
  isPerson: boolean;
  onAdd: (item: PortfolioItem) => void;
  onUpdate: (item: PortfolioItem) => void;
  onRemove: (id: number) => void;
}

export default function EditPortfolioCard({ portfolio, isPerson, onAdd, onUpdate, onRemove }: Props) {
  const { t } = useTranslation();
  const sectionTitle = isPerson ? t("profile.portfolio") : t("profile.ourWork");
  const sectionSubtitle = isPerson ? t("profile.uploadPortfolio") : t("profile.uploadProjects");
  const addItemLabel = isPerson ? t("profile.addPortfolioItem", "Ajouter un élément au portfolio") : t("profile.addProjectItem");
  const uploadLabel = isPerson ? t("profile.uploadPortfolioImages") : t("profile.uploadProjectImages");
  const titlePlaceholder = isPerson ? t("profile.portfolioTitlePlaceholder") : t("profile.projectTitlePlaceholder");
  const addButtonLabel = isPerson ? t("profile.addToPortfolio") : t("profile.addToProjects");
  const [showModal, setShowModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [image, setImage] = useState<string | null>(null);
  useScrollLock(showModal || showActionModal);
  const [title, setTitle] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedPixels, setCroppedPixels] = useState<Area | null>(null);
  const [error, setError] = useState(false);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error(t("profile.invalidImageFile")); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error(t("profile.maxFileSize")); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedItem(null);
      setImage(reader.result as string);
      setTitle("");
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedPixels(null);
      setShowModal(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!image || !title.trim()) { setError(true); return; }
    try {
      const nextImage = croppedPixels ? await getCroppedImg(image, croppedPixels) : image;
      if (selectedItem) {
        onUpdate({ ...selectedItem, image: nextImage, title: title.trim() });
      } else {
        const newId = portfolio.length > 0 ? Math.max(...portfolio.map((p) => p.id)) + 1 : 1;
        onAdd({ id: newId, image: nextImage, title: title.trim() });
      }
      closeModal();
    } catch {
      toast.error(t("profile.cropImageFailed"));
    }
  };

  const handleEditItem = (item: PortfolioItem) => {
    setSelectedItem(item);
    setImage(item.image);
    setTitle(item.title);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedPixels(null);
    setError(false);
    setShowActionModal(false);
    setShowModal(true);
  };

  const openMobileActions = (item: PortfolioItem) => {
    setSelectedItem(item);
    setShowActionModal(true);
  };

  const closeActionModal = () => {
    setShowActionModal(false);
    setSelectedItem(null);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedItem(null);
    setImage(null);
    setTitle("");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedPixels(null);
    setError(false);
  };

  return (
    <>
      <Card className="p-6 sm:p-8 mb-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{sectionTitle}</h2>
          <p className="text-gray-600">{sectionSubtitle}</p>

          {portfolio.length === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
              <div className="flex items-start gap-3">
                <Camera className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-semibold text-green-900 mb-2">{t("profile.tipTitle")}</h3>
                  <ul className="text-sm text-green-800 space-y-1.5">
                    <li>• {t("profile.tipQuality")}</li>
                    <li>• {t("profile.tipVariety")}</li>
                    <li>• {t("profile.tipBright")}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {portfolio.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {portfolio.map((item, i) => (
              <div key={i} className="relative group">
                <div className="relative overflow-hidden rounded-lg aspect-4/3">
                  <button
                    type="button"
                    onClick={() => openMobileActions(item)}
                    className="absolute inset-0 z-10 cursor-pointer md:hidden"
                    aria-label={item.title || t("profile.portfolioItemAlt")}
                  />
                  <AppImage src={item.image} alt={item.title} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover" />
                  <div className="absolute inset-0 bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200" />
                  <div className="absolute top-2 right-2 hidden gap-2 opacity-0 transition-opacity md:flex group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => handleEditItem(item)}
                      title={t("common.edit")}
                      aria-label={t("common.edit")}
                      className="p-2 bg-white/95 text-gray-700 rounded-full hover:bg-white cursor-pointer"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(item.id)}
                      title={t("profile.deleteItem", "Supprimer")}
                      aria-label={t("profile.deleteItem", "Supprimer")}
                      className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mt-2 text-center font-medium">{item.title}</p>
              </div>
            ))}
          </div>
        )}

        <div
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-green-700 transition-colors cursor-pointer group"
          onClick={() => document.getElementById("portfolio-upload")?.click()}
        >
          <input type="file" accept="image/*" id="portfolio-upload" onChange={handleUpload} title={addItemLabel} aria-label={addItemLabel} className="hidden" />
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3 group-hover:text-green-600 transition-colors" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{uploadLabel}</h3>
          <p className="text-gray-500 text-sm mb-4">{t("profile.clickToBrowse")}</p>
          <Button variant="outline" className="gap-2 cursor-pointer mb-3" type="button">
            <Plus className="h-4 w-4" /> {t("profile.chooseFiles")}
          </Button>
          <p className="text-xs text-gray-400">{t("profile.maxFileSize")}</p>
        </div>
      </Card>

      {showActionModal && selectedItem && (
        <div className="fixed inset-0 z-110 flex items-end bg-black/55 p-4 md:hidden">
          <div className="w-full rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-4 text-center">
              <p className="text-sm text-gray-500">{sectionTitle}</p>
              <h3 className="mt-1 text-base font-semibold text-gray-900">{selectedItem.title}</h3>
            </div>

            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full justify-center gap-2 cursor-pointer"
                onClick={() => handleEditItem(selectedItem)}
              >
                <Pencil className="h-4 w-4" />
                {t("common.edit")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full justify-center gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                onClick={() => {
                  onRemove(selectedItem.id);
                  closeActionModal();
                }}
              >
                <Trash2 className="h-4 w-4" />
                {t("common.delete")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-11 w-full cursor-pointer"
                onClick={closeActionModal}
              >
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showModal && image && (
        <div className="fixed inset-0 z-100 bg-black flex flex-col">
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-5 py-4 bg-black/80">
            <h3 className="text-white font-semibold text-base">{selectedItem ? t("common.edit") : addItemLabel}</h3>
            <button
              type="button"
              onClick={closeModal}
              className="text-white/70 hover:text-white text-sm cursor-pointer px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              {t("profile.cancel")}
            </button>
          </div>

          {/* Crop area */}
          <div className="relative flex-1 bg-gray-900">
            <Cropper
              image={image}
              crop={crop}
              zoom={zoom}
              aspect={4 / 3}
              showGrid={true}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setCroppedPixels(pixels)}
            />
          </div>

          {/* Controls */}
          <div className="shrink-0 bg-black/90 px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {/* Zoom */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/70 text-sm font-medium">{t("profile.zoom")}</span>
              <span className="text-white/50 text-xs tabular-nums">{Math.round((zoom - 1) / 2 * 100)}%</span>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <button type="button" onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white text-lg flex items-center justify-center shrink-0 cursor-pointer select-none">−</button>
              <input type="range" title={t("profile.zoom")} min="1" max="3" step="0.05"
                value={zoom} onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 h-1.5 rounded-full cursor-pointer accent-green-500" />
              <button type="button" onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white text-lg flex items-center justify-center shrink-0 cursor-pointer select-none">+</button>
            </div>

            {/* Title */}
            <div className="mb-4">
              <Input
                type="text"
                placeholder={titlePlaceholder}
                value={title}
                onChange={(e) => { setTitle(e.target.value); setError(false); }}
                className={`bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-green-500 ${error ? "border-red-500" : ""}`}
              />
              {error && <p className="text-xs text-red-400 mt-1">{t("profile.titleRequired")}</p>}
            </div>

            <Button
              onClick={handleSave}
              type="button"
              className="w-full bg-green-700 hover:bg-green-800 text-white h-12 text-base font-semibold rounded-xl cursor-pointer"
            >
              {selectedItem ? t("common.save") : addButtonLabel}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
