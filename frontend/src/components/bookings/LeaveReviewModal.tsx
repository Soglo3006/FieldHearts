"use client";

import { useState } from "react";
import { useScrollLock } from "@/hooks/useScrollLock";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, Star, CheckCircle } from "lucide-react";
import { sanitizePlainText } from "@/lib/sanitize";
import { useTranslation } from "react-i18next";

interface Props {
  bookingId: string;
  targetName: string;
  accessToken: string;
  onClose: () => void;
  onReviewed: (bookingId: string) => void;
}

export default function LeaveReviewModal({
  bookingId,
  targetName,
  accessToken,
  onClose,
  onReviewed,
}: Props) {
  const { t } = useTranslation();
  useScrollLock(true);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      setError(t("bookings.reviewModal.selectRating"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ booking_id: bookingId, rating, comment: sanitizePlainText(comment) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? t("bookings.reviewModal.submitFailed"));
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        onReviewed(bookingId);
        onClose();
      }, 800);
    } catch {
      setError(t("bookings.reviewModal.networkError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t("bookings.reviewModal.title")}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t("bookings.reviewModal.subtitle", { name: targetName })}</p>
          </div>
          <button aria-label={t("common.close")} onClick={onClose} className="cursor-pointer text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Star Rating */}
          <div className="space-y-2">
            <Label className="text-base font-medium text-gray-900">
              {t("bookings.reviewModal.ratingLabel")} <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={t("bookings.reviewModal.starAria", { count: i })}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setRating(i)}
                  className="cursor-pointer transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      i <= (hovered || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-gray-500">
                {["", t("bookings.reviewModal.poor"), t("bookings.reviewModal.fair"), t("bookings.reviewModal.good"), t("bookings.reviewModal.veryGood"), t("bookings.reviewModal.excellent")][rating]}
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label className="text-base font-medium text-gray-900">{t("bookings.reviewModal.commentLabel")}</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("bookings.reviewModal.commentPlaceholder")}
              className="min-h-24 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={submitting}>{t("common.cancel")}</Button>
          <Button
            className="bg-green-700 hover:bg-green-800 text-white min-w-32"
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
          >
            {success ? (
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> {t("bookings.reviewModal.submitted")}
              </span>
            ) : submitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {t("bookings.reviewModal.submitting")}
              </span>
            ) : t("bookings.reviewModal.submit")}
          </Button>
        </div>
      </div>
    </div>
  );
}
