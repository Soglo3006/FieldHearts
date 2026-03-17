"use client";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, UserStar } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

interface Review {
  id?: string | number;
  reviewer_name?: string;
  created_at?: string;
  rating?: number;
  comment?: string;
}

interface Props {
  reviews: Review[];
  reviewsLoading: boolean;
}

function ReviewCard({ r, idx, full, t }: { r: Review; idx: number; full?: boolean; t: (key: string) => string }) {
  return (
    <div key={r.id || idx} className="border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-gray-900 line-clamp-1">{r.reviewer_name || t("profile.anonymous")}</div>
        <div className="text-sm text-gray-500">
          {r.created_at
            ? new Date(r.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
            : t("home.recently")}
        </div>
      </div>
      <div className="flex items-center gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className={`h-4 w-4 ${i <= (r.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
        ))}
      </div>
      {r.comment && (
        <p className={`text-gray-700 text-sm ${full ? "" : "line-clamp-3"}`}>{r.comment}</p>
      )}
    </div>
  );
}

export default function ProfileReviews({ reviews, reviewsLoading }: Props) {
  const { t } = useTranslation();
  return (
    <>
      {/* Latest 3 */}
      <Card className="p-6 mt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t("profile.latestRatings")}</h2>

        {reviewsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.slice(0, 3).map((r, idx) => (
              <ReviewCard key={r.id || idx} r={r} idx={idx} t={t} />
            ))}
            <a href="#all-ratings">
              <Button variant="outline" className="w-full cursor-pointer">{t("profile.viewAllRatings")}</Button>
            </a>
          </div>
        ) : (
          <div className="text-center py-8">
            <UserStar className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-600">{t("profile.noReviews")}</p>
          </div>
        )}
      </Card>

      {/* All ratings */}
      {reviews.length > 0 && (
        <Card id="all-ratings" className="p-6 mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t("profile.allRatings")}</h2>
          <div className="space-y-4">
            {reviews.map((r, idx) => (
              <ReviewCard key={r.id || idx} r={r} idx={idx} full t={t} />
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
