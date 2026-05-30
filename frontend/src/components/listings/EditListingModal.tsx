"use client";

import { useEffect, useState } from "react";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MultiImageUploader from "@/components/ui/MultiImageUploader";
import LocationAutocomplete, {
  type LocationDetails,
  isResolvedLocationDetails,
} from "@/components/post/LocationAutocomplete";
import CategorySubcategoryFields from "@/components/post/CategorySubcategoryFields";
import AvailabilityLanguageMobilityFields from "@/components/post/AvailabilityLanguageMobilityFields";
import PostSelect from "@/components/post/PostSelect";
import { X, CheckCircle } from "lucide-react";
import type { ListingTranslationsPayload, ServiceLikeWithI18n } from "@/lib/serviceListingI18n";
import BilingualListingFields, {
  hasRequiredBilingualFields,
  finalizeListingPayload,
  canonicalFromTranslations,
} from "@/components/post/BilingualListingFields";
import { normalizeAvailability, normalizeMobility } from "@/lib/serviceFieldCanonical";
import type { PricingMode } from "@/lib/listingPrice";
import { normalizePricingMode } from "@/lib/listingPrice";
import type { ListingPricingFields } from "@/lib/listingPrice";
import { cn } from "@/lib/utils";
import { parseListingTags } from "@/lib/listingTags";

function stringNumPrice(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : "";
}

function seedPricingFromService(service: Service): { mode: PricingMode; price: string; min: string; max: string } {
  const mode = normalizePricingMode(service.pricing_mode);
  if (mode === "quote") return { mode: "quote", price: "", min: "", max: "" };
  if (mode === "range") {
    return {
      mode: "range",
      price: "",
      min: stringNumPrice(service.price_min ?? service.price),
      max: stringNumPrice(service.price_max),
    };
  }
  return { mode: "fixed", price: stringNumPrice(service.price), min: "", max: "" };
}

function seedListingTranslations(service: Service, uiLang: string): ListingTranslationsPayload {
  const raw = (service as Service & { translations?: unknown }).translations;
  if (raw && typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const tt = (o.title && typeof o.title === "object" ? o.title : {}) as Record<string, string>;
    const dd = (o.description && typeof o.description === "object" ? o.description : {}) as Record<string, string>;
    return {
      title: { fr: tt.fr ?? "", en: tt.en ?? "" },
      description: { fr: dd.fr ?? "", en: dd.en ?? "" },
    };
  }
  const loc = uiLang.startsWith("en") ? "en" : "fr";
  return {
    title: { [loc]: service.title ?? "" },
    description: { [loc]: service.description ?? "" },
  };
}

export interface Service {
  id: string;
  type: "offer" | "looking";
  title: string;
  description: string;
  pricing_mode?: string | null;
  price: string | number | null;
  price_min?: number | string | null;
  price_max?: number | string | null;
  location: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  category: string | null;
  category_id?: number | null;
  subcategory: string | null;
  listing_tags?: unknown;
  poster_type: string | null;
  availability: string | null;
  language: string | null;
  mobility: string | null;
  duration: string | null;
  urgency: string | null;
  image_url: string | null;
  image_urls?: string[] | null;
  is_one_time?: boolean;
  hide_exact_location?: boolean;
  translations?: ServiceLikeWithI18n["translations"];
}

interface Props {
  service: Service;
  accessToken: string;
  onClose: () => void;
  onSaved: (updated: Service) => void;
}

export default function EditListingModal({ service, accessToken, onClose, onSaved }: Props) {
  useScrollLock(true);
  const { t, i18n } = useTranslation();

  const [translations, setTranslations] = useState<ListingTranslationsPayload>(() =>
    seedListingTranslations(service, i18n.language)
  );

  const [pricingMode, setPricingMode] = useState<PricingMode>(() => seedPricingFromService(service).mode);
  const [price, setPrice] = useState(() => seedPricingFromService(service).price);
  const [priceMin, setPriceMin] = useState(() => seedPricingFromService(service).min);
  const [priceMax, setPriceMax] = useState(() => seedPricingFromService(service).max);
  const [location, setLocation] = useState(service.location);
  const [locationDetails, setLocationDetails] = useState<LocationDetails | null>(() => {
    const lat = service.latitude != null ? Number(service.latitude) : NaN;
    const lng = service.longitude != null ? Number(service.longitude) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return {
      address: service.address ?? service.location,
      lat,
      lng,
      city: service.city ?? service.location,
    };
  });
  const [category, setCategory] = useState(service.category ?? "");
  const [tags, setTags] = useState<string[]>(() => parseListingTags(service));
  const [availability, setAvailability] = useState(
    () => normalizeAvailability(service.availability ?? "") || ""
  );
  const [language, setLanguage] = useState(service.language ?? "");
  const [mobility, setMobility] = useState(() => normalizeMobility(service.mobility ?? "") || "");
  const [urgency, setUrgency] = useState(service.urgency ?? "");
  const [images, setImages] = useState<string[]>(
    service.image_urls?.length ? service.image_urls : service.image_url ? [service.image_url] : []
  );
  const [isOneTime, setIsOneTime] = useState(service.is_one_time ?? false);
  const [hideExactLocation, setHideExactLocation] = useState(service.hide_exact_location ?? false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const seed = seedPricingFromService(service);
    setPricingMode(seed.mode);
    setPrice(seed.price);
    setPriceMin(seed.min);
    setPriceMax(seed.max);
    setTranslations(seedListingTranslations(service, i18n.language));
    setAvailability(normalizeAvailability(service.availability ?? "") || "");
    setMobility(normalizeMobility(service.mobility ?? "") || "");
  }, [service.id]);

  const isOffer = service.type === "offer";

  function editPricingFields(): ListingPricingFields {
    if (pricingMode === "quote") return { pricing_mode: "quote" };
    if (pricingMode === "fixed") return { pricing_mode: "fixed", price: parseFloat(price) };
    const lo = parseFloat(priceMin);
    const hi = parseFloat(priceMax);
    return { pricing_mode: "range", price_min: lo, price_max: hi, price: lo };
  }

  const pricingOk =
    pricingMode === "quote" ||
    (pricingMode === "fixed" && price.trim() !== "" && Number(price) >= 0.01) ||
    (pricingMode === "range" &&
      priceMin.trim() !== "" &&
      priceMax.trim() !== "" &&
      Number(priceMin) >= 0.01 &&
      Number(priceMax) >= Number(priceMin));

  const locationOk = location.trim() !== "" && isResolvedLocationDetails(locationDetails);

  const isValid =
    hasRequiredBilingualFields(translations) &&
    category.trim() !== "" &&
    tags.length >= 1 &&
    pricingOk &&
    locationOk;

  const handleSave = async () => {
    if (!isValid) {
      setError(t("serviceDetail.requiredFields"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const finalized = finalizeListingPayload(translations);
      const canon = canonicalFromTranslations(finalized);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/services/${service.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            title: canon.title.trim(),
            description: canon.description.trim(),
            translations: finalized,
            ...editPricingFields(),
            location: location.trim(),
            address: locationDetails?.address ?? location.trim(),
            latitude: locationDetails?.lat ?? null,
            longitude: locationDetails?.lng ?? null,
            city: locationDetails?.city ?? location.trim(),
            category: category || null,
            listing_tags: tags,
            subcategory: tags[0] ?? null,
            availability: availability || null,
            language: language || null,
            mobility: mobility || null,
            duration: null,
            urgency: urgency || null,
            image_url: images[0] ?? null,
            image_urls: images,
            is_one_time: isOneTime,
            hide_exact_location: hideExactLocation,
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? t("serviceDetail.failedUpdate"));
        return;
      }
      const updated = await res.json();
      setSuccess(true);
      setTimeout(() => {
        onSaved(updated);
        onClose();
      }, 800);
    } catch {
      setError(t("serviceDetail.networkError"));
    } finally {
      setSaving(false);
    }
  };

  const urgencyOptions = [
    { value: "anytime", label: t("post.urgencyAnytime") },
    { value: "few-days", label: t("post.urgencyFewDays") },
    { value: "today", label: t("post.urgencyToday") },
    { value: "urgent", label: t("post.urgencyUrgent") },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-none bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t("serviceDetail.editListing")}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isOffer ? t("post.offerService") : t("serviceDetail.lookingForWorker")}
            </p>
          </div>
          <button type="button" aria-label={t("serviceDetail.close")} onClick={onClose} className="cursor-pointer text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 space-y-6 overflow-y-auto overflow-x-hidden overscroll-contain px-6 py-5">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <BilingualListingFields
            value={translations}
            onChange={setTranslations}
            mode={isOffer ? "offer" : "looking"}
          />

          <div className="space-y-2">
            <Label className="text-base font-medium text-gray-900">
              {t("post.pricingModeLabel")} <span className="text-red-500">*</span>
            </Label>
            <div className="flex flex-col sm:flex-row gap-2">
              {(
                [
                  ["fixed", t("post.pricingModeFixed")],
                  ["range", t("post.pricingModeRange")],
                  ["quote", t("post.pricingModeQuote")],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPricingMode(value)}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                    pricingMode === value
                      ? "border-green-600 bg-green-50 text-green-900"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {pricingMode === "quote" && (
              <p className="text-xs text-gray-500">{t("post.pricingQuoteHint")}</p>
            )}
          </div>

          {pricingMode === "fixed" && (
          <div className="space-y-2">
            <Label className="text-base font-medium text-gray-900">
              {isOffer ? t("post.price") : t("post.budget")} <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={t("post.amount")}
                min="0"
                step="0.01"
                className="h-12 pl-8"
              />
            </div>
            {price && Number(price) < 0.01 && (
              <p className="text-red-600 text-sm">{t("post.priceMustBePositive")}</p>
            )}
          </div>
          )}

          {pricingMode === "range" && (
          <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-base font-medium text-gray-900">
                {t("post.priceMinLabel")} <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                <Input
                  type="number"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  min="0"
                  step="0.01"
                  className="h-12 pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium text-gray-900">
                {t("post.priceMaxLabel")} <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                <Input
                  type="number"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  min="0"
                  step="0.01"
                  className="h-12 pl-8"
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500">{t("post.pricingRangeHint")}</p>
          {priceMin && priceMax && Number(priceMax) < Number(priceMin) && (
            <p className="text-red-600 text-sm">{t("post.invalidPriceRange")}</p>
          )}
          </>
          )}

          {/* Location */}
          <div className="space-y-2">
            <Label className="text-base font-medium text-gray-900">
              {t("post.location")} <span className="text-red-500">*</span>
            </Label>
            <LocationAutocomplete
              value={location}
              onChange={(val, details) => { setLocation(val); setLocationDetails(details ?? null); }}
              placeholder={t("post.locationPlaceholder")}
            />
            <p className="text-xs text-gray-500">{t("post.locationPickerHint")}</p>
            {location.trim() !== "" && !isResolvedLocationDetails(locationDetails) && (
              <p className="text-sm font-medium text-red-600">{t("post.locationMustSelectSuggestion")}</p>
            )}
          </div>

          {/* Hide exact location */}
          <div className="flex items-start gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg">
            <input
              type="checkbox"
              id="editHideLocation"
              checked={hideExactLocation}
              onChange={(e) => setHideExactLocation(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 cursor-pointer"
            />
            <label htmlFor="editHideLocation" className="cursor-pointer">
              <span className="text-sm font-medium text-gray-800">{t("post.hideExactLocation")}</span>
              <p className="text-xs text-gray-500 mt-0.5">{t("post.hideExactLocationDesc")}</p>
            </label>
          </div>

          {/* Urgency — looking only */}
          {!isOffer && (
            <div className="space-y-2">
              <Label className="text-base font-medium text-gray-900">{t("post.urgencyLevel")}</Label>
              <PostSelect
                value={urgency}
                onValueChange={setUrgency}
                placeholder={t("post.selectUrgency")}
                options={urgencyOptions}
                allowClear
              />
            </div>
          )}

          {/* Category / Subcategory / Poster type */}
          <CategorySubcategoryFields
            category={category}
            tags={tags}
            onCategoryChange={setCategory}
            onTagsChange={setTags}
            categoryRequired
          />

          {/* Availability / Language / Mobility */}
          <AvailabilityLanguageMobilityFields
            availability={availability}
            language={language}
            mobility={mobility}
            onAvailabilityChange={setAvailability}
            onLanguageChange={setLanguage}
            onMobilityChange={setMobility}
          />

          {/* Images */}
          <div className="space-y-2">
            <Label className="text-base font-medium text-gray-900">{t("serviceDetail.photos")}</Label>
            <div className="overflow-hidden">
              <MultiImageUploader images={images} onChange={setImages} aspectRatio={16 / 9} />
            </div>
          </div>

          {/* One-time listing */}
          <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <input
              type="checkbox"
              id="editIsOneTime"
              checked={isOneTime}
              onChange={(e) => setIsOneTime(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 cursor-pointer"
            />
            <label htmlFor="editIsOneTime" className="cursor-pointer">
              <span className="text-sm font-medium text-green-800">{t("post.oneTimeListing")}</span>
              <p className="text-xs text-green-700 mt-0.5">{t("post.oneTimeListingDesc")}</p>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>{t("serviceDetail.cancel")}</Button>
          <Button
            className="bg-green-700 hover:bg-green-800 text-white min-w-32"
            onClick={handleSave}
            disabled={saving || !isValid}
          >
            {success ? (
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> {t("serviceDetail.saved")}!
              </span>
            ) : saving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {t("profileEdit.saving")}
              </span>
            ) : t("profileEdit.saveChanges")}
          </Button>
        </div>
      </div>
    </div>
  );
}
