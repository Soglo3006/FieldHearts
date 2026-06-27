"use client";

import { useTranslation } from "react-i18next";

interface Props {
  page: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
}

export default function BookingSectionPagination({ page, totalPages, onPrevious, onNext }: Props) {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-3 px-1">
      <button
        type="button"
        disabled={page <= 1}
        onClick={onPrevious}
        className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {t("common.previous")}
      </button>
      <span className="text-xs text-gray-500 tabular-nums">
        {t("wallet.txPageOf", { page, total: totalPages })}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={onNext}
        className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {t("common.next")}
      </button>
    </div>
  );
}
