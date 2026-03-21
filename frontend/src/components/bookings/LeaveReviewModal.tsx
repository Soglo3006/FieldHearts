"use client";

import { useState } from "react";
import { useScrollLock } from "@/hooks/useScrollLock";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, Star, CheckCircle } from "lucide-react";

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
  useScrollLock(true);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Please select a star rating.");
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
        body: JSON.stringify({ booking_id: bookingId, rating, comment: comment.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "Failed to submit review.");
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        onReviewed(bookingId);
        onClose();
      }, 800);
    } catch {
      setError("Network error. Please try again.");
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
            <h2 className="text-lg font-semibold text-gray-900">Leave a Review</h2>
            <p className="text-xs text-gray-500 mt-0.5">Rate your experience with {targetName}</p>
          </div>
          <button onClick={onClose} className="cursor-pointer text-gray-400 hover:text-gray-600 transition-colors">
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
              Rating <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
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
                {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label className="text-base font-medium text-gray-900">Comment (optional)</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience…"
              className="min-h-24 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button
            className="bg-green-700 hover:bg-green-800 text-white min-w-32"
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
          >
            {success ? (
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Submitted!
              </span>
            ) : submitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Submitting…
              </span>
            ) : "Submit Review"}
          </Button>
        </div>
      </div>
    </div>
  );
}
