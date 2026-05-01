"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SearchX } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-green-100 rounded-full p-5">
            <SearchX className="h-12 w-12 text-green-700" />
          </div>
        </div>

        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-3">{t("notFound.title")}</h2>
        <p className="text-gray-500 mb-8">
          {t("notFound.description")}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/listings">
            <Button className="bg-green-700 hover:bg-green-800 text-white w-full sm:w-auto">
              {t("notFound.browseListings")}
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full sm:w-auto">
              {t("notFound.goHome")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
