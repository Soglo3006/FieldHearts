"use client" 
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "../locales/en.json";
import fr from "../locales/fr.json";

/** Must match SSR output; user preference is applied after mount in ConditionalShell. */
const INITIAL_LANGUAGE = "fr";

i18n
  .use(initReactI18next)
  .init({
    lng: INITIAL_LANGUAGE,
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
