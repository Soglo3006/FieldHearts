"use client";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useScrollLock } from "@/hooks/useScrollLock";

interface Props {
  open: boolean;
  type: "offer" | "looking";
  title: string;
  price: string;
  location: string;
  category: string;
  subcategory?: string;
  submitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function PostConfirmModal({
  open, type, title, price, location, category, subcategory, submitting, onConfirm, onCancel,
}: Props) {
  const { t } = useTranslation();
  useScrollLock(open);

  if (!open) return null;

  const isOffer = type === "offer";

  const rows = [
    { label: t("post.confirmLabelTitle"), value: title },
    {
      label: isOffer ? t("post.confirmLabelPrice") : t("post.confirmLabelBudget"),
      value: `${Number(price).toFixed(2)} $`,
    },
    { label: t("post.confirmLabelLocation"), value: location },
    {
      label: t("post.confirmLabelCategory"),
      value: subcategory ? `${category} · ${subcategory}` : category,
    },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">{t("post.confirmTitle")}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {isOffer ? t("post.confirmServiceDesc") : t("post.confirmJobDesc")}
          </p>
        </div>

        {/* Summary rows */}
        <div className="mx-6 mb-5 border border-gray-100 rounded-xl divide-y divide-gray-100 overflow-hidden">
          {rows.map((row) => (
            <div key={row.label} className="px-4 py-3 bg-gray-50">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{row.label}</p>
              <p className="text-sm font-semibold text-gray-800 truncate">{row.value || "—"}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 cursor-pointer"
            onClick={onCancel}
            disabled={submitting}
          >
            {t("post.confirmCancel")}
          </Button>
          <Button
            className="flex-1 bg-green-700 hover:bg-green-800 text-white cursor-pointer"
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {t("profileEdit.saving")}
              </span>
            ) : t("post.confirmPublish")}
          </Button>
        </div>
      </div>
    </div>
  );
}
