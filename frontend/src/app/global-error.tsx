"use client";

import "@/lib/i18n";
import "./globals.css";
import * as Sentry from "@sentry/nextjs";
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
  const { t, i18n } = useTranslation();

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang={i18n.resolvedLanguage || "fr"}>
      <body>
        <ErrorStateView
          title={t("errorPage.title")}
          description={t("errorPage.description")}
          tryAgainLabel={t("errorPage.tryAgain")}
          goHomeLabel={t("errorPage.goHome")}
          onRetry={reset}
        />
      </body>
    </html>
  );
}
