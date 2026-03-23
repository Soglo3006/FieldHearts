"use client";
import { useTranslation } from "react-i18next";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export default function Footer() {
  const { t, i18n } = useTranslation();

  return (
    <footer className="bg-green-900 text-gray-300 border-t border-green-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">

        {/* Rangée principale */}
        <div className="flex flex-col items-center sm:flex-row sm:items-center sm:justify-between gap-6">

          {/* Logo */}
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold text-white">Uneden</h1>
          </div>

          {/* Nav links */}
          <nav className="flex flex-wrap justify-center sm:justify-start gap-x-6 gap-y-2 text-sm font-medium ">
            <a href="#" className="hover:text-white transition-colors cursor-pointer">{t("footer.about")}</a>
            <a href="#" className="hover:text-white transition-colors cursor-pointer">{t("footer.contact")}</a>
            <a href="#" className="hover:text-white transition-colors cursor-pointer">{t("footer.privacyPolicy")}</a>
            <a href="#" className="hover:text-white transition-colors cursor-pointer">{t("footer.termsOfUse")}</a>
          </nav>

          {/* Toggle langue */}
          <ToggleGroup
            type="single"
            variant="outline"
            className="border-green-700"
            value={i18n.language === "fr" ? "FR" : "EN"}
            onValueChange={(val) => { if (val) { const lng = val.toLowerCase(); i18n.changeLanguage(lng); localStorage.setItem("i18nextLng", lng); } }}
          >
            <ToggleGroupItem value="FR" className="cursor-pointer text-sm px-3 h-8 text-white border-green-700 hover:bg-green-800">FR</ToggleGroupItem>
            <ToggleGroupItem value="EN" className="cursor-pointer text-sm px-3 h-8 text-white border-green-700 hover:bg-green-800">EN</ToggleGroupItem>
          </ToggleGroup>

        </div>

        {/* Séparateur */}
        <div className="border-t border-green-800 mt-8 pt-5 text-center">
          <p className="text-xs text-white">
            {t("footer.rights", { year: new Date().getFullYear() })}
          </p>
        </div>

      </div>
    </footer>
  );
}
