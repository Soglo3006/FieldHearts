"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PostPublishLink } from "@/components/navigation/PostPublishLink";
import { cn } from "@/lib/utils";

/** Map pin (green body, white center). */
export function EmptyStateLocationPin({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 56 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M28 4C14.5 4 4 15.8 4 29.2c0 10.4 7.8 22.2 24 38.8 16.2-16.6 24-28.4 24-38.8C52 15.8 41.5 4 28 4z"
        className="fill-green-700"
      />
      <circle cx="28" cy="29" r="8" className="fill-white" />
      <circle cx="28" cy="29" r="2.5" className="fill-green-600/20" />
    </svg>
  );
}

export type ListingsRegionEmptyStateProps = {
  locationLabel: string;
  className?: string;
  /** e.g. “adjust filters” when current filters may be too strict */
  footerHint?: string;
};

export function ListingsRegionEmptyState({
  locationLabel,
  className,
  footerHint,
}: ListingsRegionEmptyStateProps) {
  const { t } = useTranslation();
  const loc = locationLabel.trim();
  const title = loc ? t("home.emptyRegionTitle", { location: loc }) : t("home.emptyGlobalTitle");

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-7 px-5 sm:px-8 max-w-md mx-auto w-full",
        className
      )}
    >
      <EmptyStateLocationPin className="mb-3 w-14 h-auto sm:w-16 shrink-0 mx-auto" />
      <h2 className="text-2xl font-bold text-gray-900 leading-snug px-1">{title}</h2>
      <p className="mt-2 text-sm text-gray-600 max-w-sm mx-auto px-1">{t("home.emptyRegionSubtitle")}</p>
      <PostPublishLink className="mt-4 inline-flex mx-auto">
        <Button
          size="sm"
          className="bg-green-700 text-white hover:bg-green-800 cursor-pointer gap-1.5 shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {t("home.postListing")}
        </Button>
      </PostPublishLink>
      {footerHint ? (
        <p className="mt-4 text-xs text-gray-500 max-w-sm mx-auto leading-relaxed px-2">{footerHint}</p>
      ) : null}
    </div>
  );
}
