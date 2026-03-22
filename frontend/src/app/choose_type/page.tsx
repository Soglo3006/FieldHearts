"use client";

import { useTranslation } from "react-i18next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { UserPen, Building2 } from "lucide-react";
import i18n from "@/lib/i18n";

function LanguageToggle() {
  const { i18n: i18nInstance } = useTranslation();
  const activeLng = i18nInstance.language?.startsWith("fr") ? "fr" : "en";

  const handleChange = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("i18nextLng", lng);
  };

  return (
    <div className="flex items-center gap-1 text-sm font-medium">
      <button
        type="button"
        onClick={() => handleChange("fr")}
        className={`px-2 py-1 rounded transition-colors cursor-pointer ${
          activeLng === "fr" ? "font-bold underline text-green-700" : "text-gray-500 hover:text-gray-800"
        }`}
      >
        FR
      </button>
      <span className="text-gray-300">|</span>
      <button
        type="button"
        onClick={() => handleChange("en")}
        className={`px-2 py-1 rounded transition-colors cursor-pointer ${
          activeLng === "en" ? "font-bold underline text-green-700" : "text-gray-500 hover:text-gray-800"
        }`}
      >
        EN
      </button>
    </div>
  );
}

export default function ChooseTypePage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 relative">
      <div className="absolute top-3 right-4">
        <LanguageToggle />
      </div>
      <Card className="p-6 sm:p-8 max-w-lg w-full animate-in fade-in duration-300">
        <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">
          {t("onboarding.chooseType")}
        </h2>

        <div className="grid sm:grid-cols-2 gap-4 mt-6">

          <Link href="/profile/complete_profil?type=person" className="block">
            <div className="h-full cursor-pointer border rounded-xl p-6 flex flex-col items-center gap-3 transition-all hover:border-green-600 hover:bg-green-50">
              <UserPen className="h-10 w-10 text-green-700" />
              <h3 className="text-lg font-semibold text-gray-900">{t("onboarding.individual")}</h3>
              <p className="text-sm text-gray-500 text-center">
                {t("onboarding.individualDesc")}
              </p>
            </div>
          </Link>

          <Link href="/profile/complete_profil?type=company" className="block">
            <div className="h-full cursor-pointer border rounded-xl p-6 flex flex-col items-center gap-3 transition-all hover:border-green-600 hover:bg-green-50">
              <Building2 className="h-10 w-10 text-green-700" />
              <h3 className="text-lg font-semibold text-gray-900">{t("onboarding.company")}</h3>
              <p className="text-sm text-gray-500 text-center">
                {t("onboarding.companyDesc")}
              </p>
            </div>
          </Link>

        </div>
      </Card>
    </div>
  );
}
