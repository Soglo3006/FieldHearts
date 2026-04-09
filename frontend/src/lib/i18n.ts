"use client" 
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "../locales/en.json";
import fr from "../locales/fr.json";

function detectInitialLanguage(): string {
  if (typeof window === "undefined") return "fr";
  const saved = localStorage.getItem("i18nextLng");
  if (saved === "fr" || saved === "en") return saved;
  // First visit — use browser language, default to French (Quebec default)
  return navigator.language?.toLowerCase().startsWith("en") ? "en" : "fr";
}

const savedLng = detectInitialLanguage();

i18n
  .use(initReactI18next)
  .init({
    lng: savedLng,
    fallbackLng: "fr",
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
