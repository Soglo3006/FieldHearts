"use client";

import { useState, type ReactNode } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/Spinner";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useTranslation } from "react-i18next";

interface ImageCropModalProps {
  image: string;
  aspect: number;
  cropShape?: "rect" | "round";
  title: string;
  saveLabel?: string;
  footer?: ReactNode;
  onCancel: () => void;
  onSave: (croppedAreaPixels: Area) => void | Promise<void>;
}
export default function ImageCropModal({
  image,
  aspect,
  cropShape = "rect",
  title,
  saveLabel,
  footer,
  onCancel,
  onSave,
}: ImageCropModalProps) {
  const { t } = useTranslation();
  useScrollLock(true);
  const isRound = cropShape === "round";
  const minZoom = 1;
  const maxZoom = 3;
  const modalClass = isRound
    ? "w-full max-w-[520px]"
    : "w-full max-w-[min(720px,calc(100vw-1.5rem))]";
  const cropAreaClass = isRound
    ? "relative h-[min(55vh,440px)] w-full bg-[#18191a]"
    : "relative h-[min(62vh,540px)] w-full bg-[#18191a]";
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      await onSave(croppedAreaPixels);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-2 sm:p-4"
      onClick={saving ? undefined : onCancel}
    >
      <div
        className={`${modalClass} overflow-hidden rounded-2xl bg-white shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-crop-modal-title"
      >
        <div className="relative flex items-center justify-center border-b border-gray-200 px-12 py-4">
          <h2 id="image-crop-modal-title" className="text-center text-base font-semibold text-gray-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            aria-label={t("common.close")}
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className={cropAreaClass}
          onWheel={(e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            setZoom((z) => Math.min(maxZoom, Math.max(minZoom, +(z + delta).toFixed(2))));
          }}
        >
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={cropShape}
            minZoom={minZoom}
            maxZoom={maxZoom}
            showGrid={false}
            zoomWithScroll={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, px) => setCroppedAreaPixels(px)}
            style={{
              containerStyle: { background: "#18191a" },
              cropAreaStyle: {
                border: "2px solid rgba(255, 255, 255, 0.95)",
                color: "rgba(0, 0, 0, 0.55)",
              },
            }}
          />
        </div>

        <div className="border-t border-gray-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={t("common.zoomOut", "Zoom out")}
              onClick={() => setZoom((z) => Math.max(minZoom, +(z - 0.1).toFixed(2)))}
              className="flex h-8 w-8 shrink-0 cursor-pointer select-none items-center justify-center rounded-full text-lg text-gray-600 hover:bg-gray-100"
            >
              −
            </button>
            <input
              type="range"
              title={t("common.zoom", "Zoom")}
              min={minZoom}
              max={maxZoom}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-1 flex-1 cursor-pointer rounded-full accent-green-600"
            />
            <button
              type="button"
              aria-label={t("common.zoomIn", "Zoom in")}
              onClick={() => setZoom((z) => Math.min(maxZoom, +(z + 0.1).toFixed(2)))}
              className="flex h-8 w-8 shrink-0 cursor-pointer select-none items-center justify-center rounded-full text-lg text-gray-600 hover:bg-gray-100"
            >
              +
            </button>
          </div>
        </div>

        {footer && (
          <div className="border-t border-gray-200 px-5 py-4">
            {footer}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 px-5 pb-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("common.cancel")}
          </button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!croppedAreaPixels || saving}
            className="cursor-pointer rounded-lg bg-green-700 px-5 font-semibold text-white hover:bg-green-800 disabled:opacity-70"
          >
            {saving ? (
              <>
                <Spinner size="xs" className="border-white border-t-transparent" />
                {t("common.loading")}
              </>
            ) : (
              saveLabel ?? t("common.save")
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
