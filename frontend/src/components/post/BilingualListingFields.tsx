"use client";

import { useEffect, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import PostSelect from "@/components/post/PostSelect";
import { Plus, X } from "lucide-react";
import type { ListingTranslationsPayload } from "@/lib/serviceListingI18n";

type Locale = "fr" | "en";

const OTHER = (l: Locale): Locale => (l === "fr" ? "en" : "fr");

interface Props {
  value: ListingTranslationsPayload;
  onChange: (next: ListingTranslationsPayload) => void;
  /** Réutiliser sur offre (« service ») ou recherche (« job »). */
  mode?: "offer" | "looking";
}

/**
 * Titres et descriptions avec 2 langues max — synchronisé avec `translations` backend.
 */
const LANG_LABEL: Record<Locale, string> = { fr: "post.languageFrench", en: "post.languageEnglish" };

export default function BilingualListingFields({ value, onChange, mode = "offer" }: Props) {
  const { t, i18n } = useTranslation();
  const defaultLang: Locale = i18n.language?.startsWith("en") ? "en" : "fr";

  const labelFor = (code: Locale) => t(LANG_LABEL[code]);

  const [firstTitleLang, setFirstTitleLang] = useState<Locale>(defaultLang);
  const [secondTitleOpen, setSecondTitleOpen] = useState(false);
  const [firstDescLang, setFirstDescLang] = useState<Locale>(defaultLang);
  const [secondDescOpen, setSecondDescOpen] = useState(false);

  useEffect(() => {
    const tt = value.title ?? {};
    if (tt.fr?.trim() && tt.en?.trim()) setSecondTitleOpen(true);
    const dd = value.description ?? {};
    if (dd.fr?.trim() && dd.en?.trim()) setSecondDescOpen(true);
  }, []);

  const patchTitle = (lang: Locale, text: string) => {
    onChange({
      ...value,
      title: { ...(value.title ?? {}), [lang]: text },
      description: { ...(value.description ?? {}) },
    });
  };

  const patchDesc = (lang: Locale, text: string) => {
    onChange({
      ...value,
      title: { ...(value.title ?? {}) },
      description: { ...(value.description ?? {}), [lang]: text },
    });
  };

  const clearSecondTitle = () => {
    const o = OTHER(firstTitleLang);
    const next = { ...(value.title ?? {}) };
    delete next[o];
    onChange({ ...value, title: next, description: { ...(value.description ?? {}) } });
    setSecondTitleOpen(false);
  };

  const clearSecondDesc = () => {
    const o = OTHER(firstDescLang);
    const next = { ...(value.description ?? {}) };
    delete next[o];
    onChange({ ...value, title: { ...(value.title ?? {}) }, description: next });
    setSecondDescOpen(false);
  };

  const autoResize = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  const tFirst = OTHER(firstTitleLang);
  const dFirst = OTHER(firstDescLang);

  const titlePh =
    mode === "looking" ? t("post.jobTitlePlaceholder") : t("post.serviceTitlePlaceholder");
  const titlePhOther =
    mode === "looking" ? t("post.jobTitlePlaceholderOther") : t("post.serviceTitlePlaceholderOther");
  const descPh = mode === "looking" ? t("post.jobDescriptionPlaceholder") : t("post.descriptionPlaceholder");
  const descPhOther =
    mode === "looking" ? t("post.jobDescriptionPlaceholderOther") : t("post.descriptionPlaceholderOther");

  const localeSelectOptions = [
    { value: "fr" as const, label: labelFor("fr") },
    { value: "en" as const, label: labelFor("en") },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Label className="text-base font-medium text-gray-900">
          {mode === "looking" ? t("post.jobTitle") : t("post.serviceTitle")}{" "}
          <span className="text-red-500">*</span>
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <PostSelect
            value={firstTitleLang}
            onValueChange={(v) => setFirstTitleLang(v as Locale)}
            placeholder={t("post.localeLabel")}
            options={localeSelectOptions}
            ariaLabel={t("post.localeLabel")}
            className="w-full shrink-0 sm:w-[min(100%,12.5rem)]"
          />
          <Input
            className="h-12 min-h-12 flex-1"
            placeholder={titlePh}
            value={value.title?.[firstTitleLang] ?? ""}
            onChange={(e) => patchTitle(firstTitleLang, e.target.value)}
            required
          />
        </div>

        {!secondTitleOpen ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1 h-auto gap-1 px-2 py-1 text-green-700 hover:bg-green-50"
            onClick={() => setSecondTitleOpen(true)}
          >
            <Plus className="h-4 w-4" />
            {t("post.addOtherLanguage")}
          </Button>
        ) : (
          <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600">{t("post.sameFieldOtherLanguage")}</span>
              <button
                type="button"
                onClick={() => clearSecondTitle()}
                className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                aria-label={t("listings.clear")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex h-12 min-h-12 w-full shrink-0 items-center rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-800 sm:w-[min(100%,12.5rem)]">
                {labelFor(tFirst)}
              </div>
              <Input
                className="h-12 min-h-12 flex-1"
                placeholder={titlePhOther}
                value={value.title?.[tFirst] ?? ""}
                onChange={(e) => patchTitle(tFirst, e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <Label htmlFor="desc-main" className="text-base font-medium text-gray-900">
          {t("post.description")} <span className="text-red-500">*</span>
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <PostSelect
            value={firstDescLang}
            onValueChange={(v) => setFirstDescLang(v as Locale)}
            placeholder={t("post.localeLabel")}
            options={localeSelectOptions}
            ariaLabel={t("post.localeLabel")}
            className="w-full shrink-0 sm:w-[min(100%,12.5rem)]"
          />
          <Textarea
            id="desc-main"
            rows={1}
            className="flex-1 min-h-12 py-3 resize-none overflow-hidden rounded-md border-input bg-background text-sm shadow-sm"
            placeholder={descPh}
            value={value.description?.[firstDescLang] ?? ""}
            ref={(el) => { if (el) autoResize(el); }}
            onChange={(e) => { autoResize(e.target); patchDesc(firstDescLang, e.target.value); }}
            required
          />
        </div>

        {!secondDescOpen ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1 h-auto gap-1 px-2 py-1 text-green-700 hover:bg-green-50"
            onClick={() => setSecondDescOpen(true)}
          >
            <Plus className="h-4 w-4" />
            {t("post.addDescriptionOtherLanguage")}
          </Button>
        ) : (
          <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600">{t("post.sameFieldOtherLanguage")}</span>
              <button
                type="button"
                onClick={() => clearSecondDesc()}
                className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                aria-label={t("listings.clear")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <div className="flex h-12 min-h-12 w-full shrink-0 items-center rounded-md border border-input bg-background px-3 text-sm font-medium text-gray-800 sm:w-[min(100%,12.5rem)]">
                {labelFor(dFirst)}
              </div>
              <Textarea
                rows={1}
                className="flex-1 min-h-12 py-3 resize-none overflow-hidden rounded-md border-input bg-background text-sm shadow-sm"
                placeholder={descPhOther}
                value={value.description?.[dFirst] ?? ""}
                ref={(el) => { if (el) autoResize(el); }}
                onChange={(e) => { autoResize(e.target); patchDesc(dFirst, e.target.value); }}
              />
            </div>
          </div>
        )}

        <div className="rounded-lg border border-green-100 bg-green-50/80 px-4 py-3 text-sm text-green-950">
          {t("post.bilingualDescriptionNotice")}
        </div>
      </div>
    </div>
  );
}

export function hasRequiredBilingualFields(t: ListingTranslationsPayload): boolean {
  const tt = (t.title?.fr ?? "").trim() || (t.title?.en ?? "").trim();
  const dd = (t.description?.fr ?? "").trim() || (t.description?.en ?? "").trim();
  return !!(tt && dd);
}

export function finalizeListingPayload(payload: ListingTranslationsPayload): ListingTranslationsPayload {
  const sanitized: ListingTranslationsPayload = {
    title: { ...(payload.title ?? {}) },
    description: { ...(payload.description ?? {}) },
  };
  ["fr", "en"].forEach((k) => {
    const kk = k as Locale;
    if (!sanitized.title?.[kk]?.trim()) delete (sanitized.title as Record<string, string>)[kk];
    if (!sanitized.description?.[kk]?.trim()) delete (sanitized.description as Record<string, string>)[kk];
  });
  return sanitized;
}

export function canonicalFromTranslations(t: ListingTranslationsPayload): { title: string; description: string } {
  const title = ((t.title?.fr ?? "").trim() || (t.title?.en ?? "").trim() || "").slice(0, 200);
  const description = (
    (t.description?.fr ?? "").trim() ||
    (t.description?.en ?? "").trim() ||
    ""
  ).slice(0, 5000);
  return { title, description };
}
