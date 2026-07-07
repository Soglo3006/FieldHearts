"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Star, X } from "lucide-react";
import { ProfileReviewsSkeleton } from "@/components/profile/ProfileSkeleton";
import { useTranslation } from "react-i18next";

interface Review {
  id: string;
  reviewer_id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface RatingsPageProps {
  onClose: () => void;
  profileId: string;
  displayName: string;
}

const REVIEWS_PER_PAGE = 5;

function StarRow({ rating }: { rating: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`h-4 w-4 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200 fill-gray-200"}`} />
      ))}
    </div>
  );
}

export default function RatingsPage({ onClose, profileId, displayName }: RatingsPageProps) {
  const { t, i18n } = useTranslation();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reviews/${profileId}`);
        if (!response.ok) throw new Error();
        const data = await response.json();
        setReviews(data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [profileId]);

  const avg = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;
  const avgDisplay = avg.toFixed(1);

  const totalPages = Math.ceil(reviews.length / REVIEWS_PER_PAGE);
  const paginatedReviews = reviews.slice((currentPage - 1) * REVIEWS_PER_PAGE, currentPage * REVIEWS_PER_PAGE);

  return (
    <div className="flex min-h-full flex-col bg-white">

      {/* Header */}
      <div className="flex items-start justify-between px-6 py-5 border-b shrink-0">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{t("profile.ratingsAndReviews", "Ratings & Reviews")}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{displayName}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="mt-0.5 cursor-pointer text-gray-400 hover:text-gray-700"
          aria-label="Close ratings"
          title="Close ratings"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Body */}
      {loading ? (
        <div className="px-6 py-6">
          <ProfileReviewsSkeleton rows={5} />
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <Star className="h-12 w-12 text-gray-200 mb-3" />
          <p className="font-semibold text-gray-800">{t("profile.noReviewsYet", "Aucun avis pour l'instant")}</p>
          <p className="text-sm text-gray-400 mt-1">{displayName} {t("profile.noReviewsDesc", "n'a pas encore reçu d'avis.")}</p>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">

          {/* Left — Summary */}
          <div className="md:w-56 lg:w-64 shrink-0 border-b md:border-b-0 md:border-r bg-white px-6 py-6 flex flex-col items-center gap-4">
            {/* Big number */}
            <div className="text-center">
              <p className="text-6xl font-bold text-gray-900 leading-none">{avgDisplay}</p>
              <div className="flex justify-center mt-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className={`h-5 w-5 ${i < Math.round(avg) ? "fill-yellow-400 text-yellow-400" : "text-gray-200 fill-gray-200"}`} />
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                {reviews.length} {t("profile.reviewsCount", "avis")}
              </p>
            </div>

            {/* Bar breakdown */}
            <div className="w-full space-y-2 mt-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = reviews.filter(r => r.rating === star).length;
                const percent = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-3 shrink-0">{star}</span>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 shrink-0" />
                    <progress
                      className="h-1.5 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-gray-200 [&::-webkit-progress-value]:bg-yellow-400 [&::-moz-progress-bar]:bg-yellow-400"
                      value={percent}
                      max={100}
                    />
                    <span className="text-xs text-gray-400 w-3 text-right shrink-0">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right — Reviews list */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {paginatedReviews.map((review) => (
                <div key={review.id} className="flex gap-3 py-4 border-b border-gray-50 last:border-0">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-green-100 text-green-800 font-semibold text-sm">
                      {(review.reviewer_name || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-semibold text-gray-900 text-sm truncate">{review.reviewer_name}</p>
                      <p className="text-xs text-gray-400 shrink-0">
                        {new Date(review.created_at).toLocaleDateString(i18n.language, {
                          month: "long", day: "numeric", year: "numeric",
                        })}
                      </p>
                    </div>
                    <StarRow rating={review.rating} />
                    {review.comment && (
                      <p className="text-sm text-gray-600 leading-relaxed mt-2">{review.comment}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="shrink-0 flex items-center justify-center gap-1.5 px-6 py-3 border-t bg-white">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="cursor-pointer px-3 text-xs font-medium text-gray-600"
                >
                  ←
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    size="icon"
                    variant={currentPage === page ? "default" : "ghost"}
                    className={`h-8 w-8 cursor-pointer text-xs font-medium ${
                      currentPage === page
                        ? "bg-green-700 text-white hover:bg-green-800"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="cursor-pointer px-3 text-xs font-medium text-gray-600"
                >
                  →
                </Button>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
