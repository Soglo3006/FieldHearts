"use client";
import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useScrollLock } from "@/hooks/useScrollLock";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2, Plus, X, ArrowLeft } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import getCroppedImg from "@/utils/cropImage";

interface PortfolioItem {
  id?: string | number;
  image: string;
  title: string;
  description?: string;
}

interface Props {
  portfolio: PortfolioItem[];
  isPerson: boolean;
  isOwner?: boolean;
  onPortfolioSave?: (updated: PortfolioItem[]) => Promise<void>;
}

export default function ProfilePortfolio({ portfolio, isPerson, isOwner, onPortfolioSave }: Props) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<PortfolioItem | null>(null);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editItems, setEditItems] = useState<PortfolioItem[]>([]);
  const [saving, setSaving] = useState(false);

  // Add-item view (inside the modal, no separate overlay)
  const [view, setView] = useState<"list" | "add">("list");
  const [newImage, setNewImage] = useState<string | null>(null);
  const [newRawImage, setNewRawImage] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newError, setNewError] = useState(false);

  // Cropper (full-screen overlay, same as before)
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useScrollLock(!!selected || editOpen || showCropper);

  const openEdit = () => {
    setEditItems(portfolio.map((item) => ({ ...item })));
    setView("list");
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    resetAddForm();
  };

  const resetAddForm = () => {
    setNewImage(null);
    setNewRawImage(null);
    setNewTitle("");
    setNewDescription("");
    setNewError(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const goToAdd = () => {
    resetAddForm();
    setView("add");
  };

  const goToList = () => {
    setView("list");
    resetAddForm();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setNewRawImage(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
    // reset input so same file can be re-selected
    e.target.value = "";
  };

  const confirmCrop = async () => {
    if (!newRawImage || !croppedAreaPixels) return;
    const cropped = await getCroppedImg(newRawImage, croppedAreaPixels);
    setNewImage(cropped);
    setShowCropper(false);
    setNewRawImage(null);
  };

  const handleConfirmAdd = () => {
    if (!newTitle.trim() || !newImage) {
      setNewError(true);
      return;
    }
    setEditItems((prev) => [
      ...prev,
      { id: Date.now(), image: newImage, title: newTitle.trim(), description: newDescription.trim() },
    ]);
    goToList();
  };

  const handleTitleChange = (index: number, value: string) => {
    setEditItems((prev) => prev.map((item, i) => (i === index ? { ...item, title: value } : item)));
  };

  const handleDelete = (index: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!onPortfolioSave) return;
    setSaving(true);
    try {
      await onPortfolioSave(editItems);
      closeEdit();
    } finally {
      setSaving(false);
    }
  };

  if (portfolio.length === 0 && !isOwner) return null;

  return (
    <>
      <Card className="p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            {isPerson ? t("profile.portfolio") : t("profile.ourProjects")}
          </h2>
          {isOwner && onPortfolioSave && (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 text-sm cursor-pointer"
              onClick={openEdit}
            >
              <Pencil className="h-4 w-4" />
              {t("profile.editPortfolio", "Modifier")}
            </Button>
          )}
        </div>

        {portfolio.length === 0 ? (
          <p className="text-gray-400 text-sm">{t("profile.noPortfolio", "Aucun élément dans le portfolio.")}</p>
        ) : (
          <Carousel opts={{ align: "start", loop: false }} className="w-full">
            <CarouselContent className="-ml-4">
              {portfolio.map((item, index) => (
                <CarouselItem key={item.id || index} className="pl-4 basis-1/2 md:basis-1/3">
                  <div className="group cursor-pointer" onClick={() => setSelected(item)}>
                    <div className="relative overflow-hidden rounded-lg aspect-4/3">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                    </div>
                    <p className="text-sm font-medium text-gray-700 text-center mt-2">{item.title}</p>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {portfolio.length > 4 && (
              <>
                <CarouselPrevious className="-left-4 cursor-pointer" />
                <CarouselNext className="-right-4 cursor-pointer" />
              </>
            )}
          </Carousel>
        )}
      </Card>

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-3xl w-full overflow-hidden relative animate-in fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              type="button"
              aria-label="Fermer"
              className="absolute top-3 right-3 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded"
              onClick={() => setSelected(null)}
            >
              ✕
            </Button>
            <div className="w-full aspect-4/3 bg-gray-200">
              <img src={selected.image} alt={selected.title} className="w-full h-full object-cover" />
            </div>
            <h3 className="text-base font-semibold text-center px-4 py-3">{selected.title}</h3>
          </div>
        </div>
      )}

      {/* Edit / Add portfolio modal */}
      {editOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeEdit}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90dvh] flex flex-col overflow-hidden animate-in fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header — changes based on view */}
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              {view === "add" ? (
                <button
                  type="button"
                  onClick={goToList}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("profile.portfolio", "Portfolio")}
                </button>
              ) : (
                <h2 className="text-lg font-semibold text-gray-900">
                  {isPerson ? t("profile.portfolio") : t("profile.ourProjects")}
                </h2>
              )}
              <button
                type="button"
                aria-label="Fermer"
                onClick={closeEdit}
                className="text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sliding body */}
            <div className="flex-1 overflow-hidden relative">
              <div
                className={`flex h-full w-[200%] transition-transform duration-300 ease-in-out ${view === "add" ? "-translate-x-1/2" : "translate-x-0"}`}
              >
                {/* — LIST VIEW — */}
                <div className="w-1/2 h-full overflow-y-auto px-6 py-4">
                  {editItems.length === 0 && (
                    <p className="text-gray-400 text-sm text-center py-6">
                      {t("profile.noPortfolio", "Aucun élément. Ajoutez-en un ci-dessous.")}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {editItems.map((item, index) => (
                      <div key={item.id || index} className="flex flex-col gap-1.5">
                        {/* Image with delete overlay */}
                        <div className="relative rounded-lg overflow-hidden aspect-4/3 bg-gray-100 group">
                          <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            title={t("profile.deleteItem", "Supprimer")}
                            aria-label={t("profile.deleteItem", "Supprimer")}
                            onClick={() => handleDelete(index)}
                            className="absolute top-1.5 right-1.5 w-7 h-7 flex items-center justify-center rounded-full bg-black/50 hover:bg-red-600 text-white cursor-pointer transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {/* Title input */}
                        <Input
                          value={item.title}
                          onChange={(e) => handleTitleChange(index, e.target.value)}
                          className="h-7 text-xs px-2"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* — ADD VIEW — */}
                <div className="w-1/2 h-full overflow-y-auto px-6 py-4 space-y-4">
                  <h3 className="text-base font-semibold text-gray-800">
                    {t("profile.addItem", "Ajouter un élément")}
                  </h3>

                  {/* Image upload / preview */}
                  {!newImage ? (
                    <label className="w-full h-40 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                      <span className="text-gray-500 text-sm text-center px-4">
                        {t("portfolio.clickToUpload", "Cliquer pour télécharger une image")}
                      </span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="relative">
                      <div className="w-full aspect-4/3 rounded-xl overflow-hidden bg-gray-100">
                        <img src={newImage} alt="preview" className="w-full h-full object-cover" />
                      </div>
                      <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl cursor-pointer opacity-0 hover:opacity-100 transition-opacity">
                        <span className="text-white text-sm font-medium">
                          {t("portfolio.changeImage", "Changer l'image")}
                        </span>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                    </div>
                  )}

                  {/* Title */}
                  <div className="space-y-1.5">
                    <Label>{t("portfolio.title", "Titre")} *</Label>
                    <Input
                      value={newTitle}
                      onChange={(e) => { setNewTitle(e.target.value); if (newError) setNewError(false); }}
                      placeholder={t("portfolio.titlePlaceholder", "ex: Rénovation salle de bain")}
                    />
                    {newError && (
                      <p className="text-red-500 text-xs">
                        {t("portfolio.titleRequired", "Le titre et l'image sont requis.")}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <Label>{t("portfolio.description", "Description")} <span className="text-gray-400 font-normal text-xs">({t("serviceDetail.optional", "optionnel")})</span></Label>
                    <Textarea
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder={t("portfolio.descriptionPlaceholder", "Courte description...")}
                      className="resize-none min-h-20"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer — changes based on view */}
            <div className="px-6 py-4 border-t shrink-0 flex items-center gap-3">
              {view === "list" ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1.5 cursor-pointer"
                    onClick={goToAdd}
                  >
                    <Plus className="h-4 w-4" />
                    {t("profile.addItem", "Ajouter")}
                  </Button>
                  <div className="flex-1" />
                  <Button variant="outline" className="cursor-pointer" onClick={closeEdit}>
                    {t("common.cancel", "Annuler")}
                  </Button>
                  <Button
                    className="bg-green-700 hover:bg-green-800 text-white cursor-pointer"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? <Spinner size="sm" /> : t("common.save", "Sauvegarder")}
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex-1" />
                  <Button variant="outline" className="cursor-pointer" onClick={goToList}>
                    {t("common.cancel", "Annuler")}
                  </Button>
                  <Button
                    className="bg-green-700 hover:bg-green-800 text-white cursor-pointer"
                    onClick={handleConfirmAdd}
                  >
                    {t("portfolio.confirm", "Confirmer")}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full-screen cropper overlay */}
      {showCropper && newRawImage && (
        <div className="fixed inset-0 z-60 flex flex-col bg-black">
          <div className="shrink-0 flex items-center justify-between px-5 py-4 bg-black/80">
            <h3 className="text-white font-semibold text-base">
              {t("portfolio.adjustImage", "Ajuster l'image")}
            </h3>
            <button
              type="button"
              onClick={() => { setShowCropper(false); setNewRawImage(null); }}
              className="text-white/70 hover:text-white text-sm cursor-pointer px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              {t("common.cancel", "Annuler")}
            </button>
          </div>
          <div className="relative flex-1 bg-gray-900">
            <Cropper
              image={newRawImage}
              crop={crop}
              zoom={zoom}
              aspect={4 / 3}
              showGrid
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
            />
          </div>
          <div className="shrink-0 bg-black/90 px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/70 text-sm font-medium">{t("portfolio.zoom", "Zoom")}</span>
              <span className="text-white/50 text-xs tabular-nums">{Math.round(((zoom - 1) / 2) * 100)}%</span>
            </div>
            <div className="flex items-center gap-3 mb-5">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white text-lg flex items-center justify-center shrink-0 cursor-pointer select-none"
              >−</button>
              <input
                type="range"
                title="Zoom"
                min={1} max={3} step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 h-1.5 rounded-full cursor-pointer accent-green-500"
              />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white text-lg flex items-center justify-center shrink-0 cursor-pointer select-none"
              >+</button>
            </div>
            <Button
              type="button"
              onClick={confirmCrop}
              className="w-full bg-green-700 hover:bg-green-800 text-white h-12 text-base font-semibold rounded-xl cursor-pointer"
            >
              {t("portfolio.confirmCrop", "Confirmer")}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
