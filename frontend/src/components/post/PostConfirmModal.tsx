"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useScrollLock } from "@/hooks/useScrollLock";
import AppImage from "@/components/ui/AppImage";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

type LangCode = "fr" | "en";

export type PostConfirmLangStrings = Partial<Record<LangCode, string>>;

interface SummaryRow {
  key: string;
  label: string;
  value: string;
  multiline?: boolean;
  /** Red explanatory text (e.g. annonce unique) */
  valueDanger?: boolean;
  /** Red badge beside label when exact address is hidden on the map */
  showAddressHiddenBadge?: boolean;
}

interface Props {
  open: boolean;
  type: "offer" | "looking";
  titlesByLang: PostConfirmLangStrings;
  descriptionsByLang: PostConfirmLangStrings;
  /** Preformatted listing price summary (fixed, range, or quote). */
  priceSummary: string;
  locations: string[];
  hideExactLocation: boolean;
  /** Localised category line, e.g. "Maison · Ménage profond". */
  categoryLine: string;
  subcategoryLine?: string | null;
  availabilityLabel: string | null;
  spokenLanguageLabel: string | null;
  mobilityLabel: string | null;
  urgencyLabel?: string | null;
  /** Annexe « annonce unique » cochée sur le formulaire */
  isOneTime?: boolean;
  isPublic?: boolean;
  imageUrls: string[];
  submitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Aligné sur ServiceHero (page détail service) : flèches et compteur */
function ConfirmImagesCarousel({ urls }: { urls: string[] }) {
  const validImages = urls.filter(Boolean);
  const count = validImages.length;
  const [api, setApi] = useState<CarouselApi>();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!api) return;
    const handleSelect = () => setIndex(api.selectedScrollSnap());
    handleSelect();
    api.on("select", handleSelect);
    api.on("reInit", handleSelect);
    return () => {
      api.off("select", handleSelect);
      api.off("reInit", handleSelect);
    };
  }, [api]);

  if (count === 0) return null;

  if (count === 1) {
    return (
      <div className="relative mt-2 aspect-video w-full overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
        <AppImage
          src={validImages[0]}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 512px) 100vw, 512px"
        />
      </div>
    );
  }

  return (
    <div className="relative mt-2 aspect-video w-full overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
      <Carousel
        setApi={setApi}
        opts={{ align: "start", loop: count > 1 }}
        className="h-full w-full"
      >
        <CarouselContent className="ml-0 h-full">
          {validImages.map((src, imageIndex) => (
            <CarouselItem key={`${src}-${imageIndex}`} className="h-full pl-0">
              <AppImage
                src={src}
                alt=""
                width={1600}
                height={900}
                sizes="(max-width: 512px) 100vw, 512px"
                className="h-full w-full object-cover"
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-3 top-1/2 z-10 border-0 bg-black/40 text-white hover:bg-black/60 hover:text-white disabled:pointer-events-none disabled:opacity-40" />
        <CarouselNext className="right-3 top-1/2 z-10 border-0 bg-black/40 text-white hover:bg-black/60 hover:text-white disabled:pointer-events-none disabled:opacity-40" />
      </Carousel>
      <span className="absolute top-3 right-3 z-11 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
        {index + 1} / {count}
      </span>
    </div>
  );
}

export default function PostConfirmModal({
  open,
  type,
  titlesByLang,
  descriptionsByLang,
  priceSummary,
  locations,
  hideExactLocation,
  categoryLine,
  subcategoryLine,
  availabilityLabel,
  spokenLanguageLabel,
  mobilityLabel,
  urgencyLabel,
  isOneTime = false,
  isPublic = true,
  imageUrls,
  submitting,
  onConfirm,
  onCancel,
}: Props) {
  const { t } = useTranslation();
  useScrollLock(open);

  if (!open) return null;

  const isOffer = type === "offer";

  const langNames: Record<LangCode, string> = {
    fr: t("post.languageFrench"),
    en: t("post.languageEnglish"),
  };

  const rows: SummaryRow[] = [];

  /** Par langue : titre puis description (FR ensemble, puis EN, etc.) */
  (["fr", "en"] as const).forEach((lang) => {
    const tit = titlesByLang[lang]?.trim();
    if (tit) {
      rows.push({
        key: `title-${lang}`,
        label: `${t("post.confirmLabelTitle")} (${langNames[lang]})`,
        value: tit,
      });
    }
    const desc = descriptionsByLang[lang]?.trim();
    if (desc) {
      rows.push({
        key: `desc-${lang}`,
        label: `${t("post.confirmLabelDescription")} (${langNames[lang]})`,
        value: desc,
        multiline: true,
      });
    }
  });

  rows.push({
    key: "price",
    label: isOffer ? t("post.confirmLabelPrice") : t("post.confirmLabelBudget"),
    value: priceSummary,
  });

  const locationValue = locations
    .map((value) => value.trim())
    .filter(Boolean)
    .join("\n");

  rows.push({
    key: "location",
    label: t("post.confirmLabelLocation"),
    value: locationValue,
    multiline: true,
    showAddressHiddenBadge: hideExactLocation,
  });

  rows.push({
    key: "category",
    label: t("post.confirmLabelCategory"),
    value: categoryLine.trim() || "—",
  });

  if (subcategoryLine?.trim()) {
    rows.push({
      key: "subcategory",
      label: t("post.confirmLabelSubcategory"),
      value: subcategoryLine.trim(),
      multiline: true,
    });
  }

  const optionalRows: SummaryRow[] = [];

  if (availabilityLabel) {
    optionalRows.push({
      key: "availability",
      label: t("post.availability"),
      value: availabilityLabel,
    });
  }
  if (spokenLanguageLabel) {
    optionalRows.push({
      key: "language",
      label: t("post.spokenLanguage"),
      value: spokenLanguageLabel,
    });
  }
  if (mobilityLabel) {
    optionalRows.push({
      key: "mobility",
      label: t("post.mobility"),
      value: mobilityLabel,
    });
  }
  if (!isOffer && urgencyLabel) {
    optionalRows.push({
      key: "urgency",
      label: t("post.urgencyLevel"),
      value: urgencyLabel,
    });
  }

  optionalRows.push({
    key: "visibility",
    label: t("post.confirmLabelVisibility"),
    value: isPublic ? t("post.listingPublicDesc") : t("post.listingPrivateDesc"),
    multiline: true,
    valueDanger: !isPublic,
  });

  if (isOneTime) {
    optionalRows.push({
      key: "one-time",
      label: t("post.oneTimeListing"),
      value: t("post.oneTimeListingDesc"),
      multiline: true,
      valueDanger: true,
    });
  }

  const allRows = [...rows, ...optionalRows];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-white animate-in fade-in slide-in-from-bottom-4 max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl shadow-xl duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pb-4 pt-6 text-center">
          <h2 className="text-lg font-bold text-gray-900">{t("post.confirmTitle")}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {isOffer
              ? (isPublic ? t("post.confirmServiceDesc") : t("post.confirmServicePrivateDesc"))
              : (isPublic ? t("post.confirmJobDesc") : t("post.confirmJobPrivateDesc"))}
          </p>
        </div>

        {/* Summary */}
        <div className="mx-6 mb-5 max-h-[min(52vh,26rem)] overflow-y-auto rounded-xl border border-gray-100">
          <div className="divide-y divide-gray-100">
            {allRows.map((row) => (
              <div key={row.key} className="bg-white px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{row.label}</p>
                  {row.showAddressHiddenBadge && (
                    <>
                      <span className="text-xs font-medium text-gray-400" aria-hidden>
                        ·
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wide text-red-600">
                        {t("post.confirmAddressHiddenBadge")}
                      </span>
                    </>
                  )}
                </div>
                <p
                  className={cn(
                    "text-sm wrap-break-word leading-snug",
                    row.valueDanger
                      ? "mt-1 font-medium text-red-600 whitespace-pre-wrap"
                      : cn("font-semibold text-gray-800", row.multiline && "mt-1 whitespace-pre-wrap")
                  )}
                >
                  {row.value || "—"}
                </p>
              </div>
            ))}

            {imageUrls.length > 0 && (
              <div className="bg-white px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  {t("post.confirmLabelImages")}
                </p>
                <ConfirmImagesCarousel urls={imageUrls} />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <Button
            variant="outline"
            className="flex-1 cursor-pointer"
            onClick={onCancel}
            disabled={submitting}
          >
            {t("post.confirmCancel")}
          </Button>
          <Button
            className="flex-1 cursor-pointer bg-green-700 text-white hover:bg-green-800"
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {t("profileEdit.saving")}
              </span>
            ) : (
              t("post.confirmPublish")
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
