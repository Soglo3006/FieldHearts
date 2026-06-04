"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ErrorStateView } from "@/components/ui/ErrorStateView";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <ErrorStateView
      title={t("errorPage.title")}
      description={t("errorPage.description")}
      tryAgainLabel={t("errorPage.tryAgain")}
      goHomeLabel={t("errorPage.goHome")}
      onRetry={reset}
    />
  );
}
