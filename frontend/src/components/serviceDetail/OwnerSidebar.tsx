"use client";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { getIntlLocale } from "@/lib/locale";

export interface ListingCompletionSummary {
  completed_at?: string | null;
  completed_by_worker?: boolean;
  completed_by_client?: boolean;
  client_name?: string | null;
  worker_name?: string | null;
}

interface Props {
  confirmDelete: boolean;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onCancelDelete: () => void;
  completionSummary?: ListingCompletionSummary | null;
}

export default function OwnerSidebar({
  confirmDelete,
  deleting,
  onEdit,
  onDelete,
  onCancelDelete,
  completionSummary = null,
}: Props) {
  const { t, i18n } = useTranslation();
  const dateLocale = getIntlLocale(i18n.language, { fr: "fr-CA", en: "en-CA" });
  const completedDate = completionSummary?.completed_at
    ? new Date(completionSummary.completed_at).toLocaleDateString(dateLocale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="space-y-4">
    <div className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm space-y-3">
      <h3 className="font-semibold text-gray-900 mb-2">{t("serviceDetail.manageListing")}</h3>
      <Button
        className="w-full bg-green-700 hover:bg-green-800 text-white h-12 gap-2"
        onClick={onEdit}
      >
        {t("serviceDetail.editListing")}
      </Button>
      {confirmDelete ? (
        <div className="space-y-2">
          <p className="text-sm text-red-600 text-center font-medium">
            {t("serviceDetail.deleteConfirmWarning")}
          </p>
          <Button
            className="w-full bg-red-600 hover:bg-red-700 text-white h-11"
            onClick={onDelete}
            disabled={deleting}
          >
            {deleting ? t("serviceDetail.deleting") : t("serviceDetail.yesDeleteListing")}
          </Button>
          <Button variant="outline" className="w-full h-11" onClick={onCancelDelete}>
            {t("common.cancel")}
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full h-12 text-red-600 border-red-200 hover:bg-red-50 gap-2"
          onClick={onDelete}
        >
          {t("serviceDetail.deleteListing")}
        </Button>
      )}
      <Link href="/my-listings">
        <Button variant="outline" className="w-full h-11 mt-1">
          {t("serviceDetail.viewAllMyListings")}
        </Button>
      </Link>
    </div>

    {completionSummary && (
      <div className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm space-y-3">
        <h3 className="font-semibold text-gray-900">{t("serviceDetail.listingStatusTitle")}</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-500">{t("serviceDetail.listingStatusLabel")}</span>
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
              {t("serviceDetail.listingStatusCompleted")}
            </span>
          </div>
          <div className="border-t border-gray-100 pt-3 space-y-2">
            <p className="text-gray-500">{t("serviceDetail.listingCompletedBy")}</p>
            <div className="space-y-1.5">
              <p className={`flex items-center gap-2 ${completionSummary.completed_by_client ? "text-gray-800" : "text-gray-400"}`}>
                <CheckCircle className={`h-4 w-4 shrink-0 ${completionSummary.completed_by_client ? "text-green-600" : ""}`} />
                <span>
                  {t("bookings.clientLabel")}: {completionSummary.client_name || t("serviceDetail.listingCompletedPending")}
                  {!completionSummary.completed_by_client && ` (${t("bookings.pending")})`}
                </span>
              </p>
              <p className={`flex items-center gap-2 ${completionSummary.completed_by_worker ? "text-gray-800" : "text-gray-400"}`}>
                <CheckCircle className={`h-4 w-4 shrink-0 ${completionSummary.completed_by_worker ? "text-green-600" : ""}`} />
                <span>
                  {t("bookings.providerLabel")}: {completionSummary.worker_name || t("serviceDetail.listingCompletedPending")}
                  {!completionSummary.completed_by_worker && ` (${t("bookings.pending")})`}
                </span>
              </p>
            </div>
          </div>
          {completedDate && (
            <p className="text-xs text-gray-400 pt-1">
              {t("serviceDetail.listingCompletedOn", { date: completedDate })}
            </p>
          )}
        </div>
      </div>
    )}
    </div>
  );
}
