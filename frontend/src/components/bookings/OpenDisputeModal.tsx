"use client";

import { useRef, useState } from "react";
import { useScrollLock } from "@/hooks/useScrollLock";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import AppImage from "@/components/ui/AppImage";
import { X, AlertTriangle, CheckCircle, ImagePlus, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  bookingId: string;
  serviceTitle: string;
  accessToken: string;
  onClose: () => void;
  onOpened: (bookingId: string) => void;
}

export default function OpenDisputeModal({
  bookingId,
  serviceTitle,
  accessToken,
  onClose,
  onOpened,
}: Props) {
  const { t } = useTranslation();
  useScrollLock(true);
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isValid = description.trim().length >= 20;

  const handlePhotos = (files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter(f => f.type.startsWith("image/")).slice(0, 4);
    setPhotos(prev => [...prev, ...valid].slice(0, 4));
    setPreviews(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))].slice(0, 4));
  };

  const removePhoto = (idx: number) => {
    URL.revokeObjectURL(previews[idx]);
    setPhotos(p => p.filter((_, i) => i !== idx));
    setPreviews(p => p.filter((_, i) => i !== idx));
  };

  const uploadPhotos = async (disputeId: string) => {
    const results: { url: string; name: string }[] = [];
    for (const file of photos) {
      const ext = file.name.split(".").pop();
      const path = `${disputeId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("dispute-attachments").upload(path, file);
      if (error) continue;
      const { data } = supabase.storage.from("dispute-attachments").getPublicUrl(path);
      results.push({ url: data.publicUrl, name: file.name });
    }
    return results;
  };

  const handleSubmit = async () => {
    if (!isValid) {
      setError(t("bookings.openDisputeModal.descriptionTooShort"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      // 1. Create dispute
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/disputes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ booking_id: bookingId, description: description.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? t("bookings.openDisputeModal.openFailed"));
        return;
      }
      const dispute = await res.json();

      // 2. Upload photos if any, then post first message
      let attachments: { url: string; name: string }[] = [];
      if (photos.length > 0) {
        setUploading(true);
        attachments = await uploadPhotos(dispute.id);
        setUploading(false);
      }

      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/disputes/${dispute.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ content: description.trim(), attachments }),
      });

      setSuccess(true);
      setTimeout(() => { onOpened(bookingId); onClose(); }, 800);
    } catch {
      setError(t("bookings.openDisputeModal.networkError"));
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{t("bookings.openDisputeModal.title")}</h2>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{serviceTitle}</p>
            </div>
          </div>
          <button type="button" aria-label={t("common.close")} onClick={onClose} className="cursor-pointer text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800 space-y-1.5">
            <p>{t("bookings.openDisputeModal.intro")}</p>
            <ul className="list-disc list-inside text-xs text-red-700 space-y-0.5">
              <li>{t("bookings.openDisputeModal.ruleCompleted")}</li>
              <li>{t("bookings.openDisputeModal.ruleInProgress")}</li>
              <li>{t("bookings.openDisputeModal.ruleFees")}</li>
              <li>{t("bookings.openDisputeModal.ruleCaseByCase")}</li>
            </ul>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="space-y-2">
            <Label className="text-base font-medium text-gray-900">
              {t("bookings.openDisputeModal.describeLabel")} <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("bookings.openDisputeModal.describePlaceholder")}
              className="min-h-32 resize-none"
            />
            <p className={`text-xs text-right ${description.length < 20 ? "text-gray-400" : "text-green-600"}`}>
              {t("bookings.openDisputeModal.minimumCount", { count: description.length })}
            </p>
          </div>

          {/* Photo upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">{t("bookings.openDisputeModal.photosLabel")}</Label>
            <div className="flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative">
                  <AppImage src={src} alt={t("bookings.openDisputeModal.photoAlt", { number: i + 1 })} width={64} height={64} className="h-16 w-16 object-cover rounded-lg border border-gray-200" />
                  <button
                    type="button"
                    aria-label={t("bookings.openDisputeModal.removePhoto")}
                    onClick={() => removePhoto(i)}
                    className="absolute -top-1 -right-1 bg-gray-800 text-white rounded-full h-4 w-4 flex items-center justify-center"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
              {photos.length < 4 && (
                <button
                  type="button"
                  aria-label={t("bookings.openDisputeModal.addPhoto")}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-16 w-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors"
                >
                  <ImagePlus className="h-5 w-5" />
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              aria-label={t("bookings.openDisputeModal.uploadPhotos")}
              title={t("bookings.openDisputeModal.uploadPhotos")}
              onChange={(e) => handlePhotos(e.target.files)}
            />
          </div>

          {uploading && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("bookings.openDisputeModal.uploading")}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={submitting}>{t("common.cancel")}</Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white min-w-36"
            onClick={handleSubmit}
            disabled={submitting || !isValid}
          >
            {success ? (
              <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4" /> {t("bookings.openDisputeModal.opened")}</span>
            ) : submitting ? (
              <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> {t("bookings.openDisputeModal.opening")}</span>
            ) : t("bookings.openDisputeModal.openButton")}
          </Button>
        </div>
      </div>
    </div>
  );
}
