"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

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
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-red-100 rounded-full p-5">
            <AlertTriangle className="h-12 w-12 text-red-600" />
          </div>
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
          {t("errorPage.title")}
        </h1>
        <p className="text-gray-500 mb-8">
          {t("errorPage.description")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            className="bg-green-700 hover:bg-green-800 text-white w-full sm:w-auto"
            onClick={reset}
          >
            {t("errorPage.tryAgain")}
          </Button>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => (window.location.href = "/")}
          >
            {t("errorPage.goHome")}
          </Button>
        </div>
      </div>
    </div>
  );
}
