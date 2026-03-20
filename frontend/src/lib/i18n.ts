"use client" 
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "../locales/en.json";
import fr from "../locales/fr.json";

const savedLng =
  typeof window !== "undefined"
    ? (localStorage.getItem("i18nextLng") || "fr")
    : "fr";

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
