"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MultiImageUploader from "@/components/ui/MultiImageUploader";
import LocationAutocomplete, { type LocationDetails } from "@/components/post/LocationAutocomplete";
import CategorySubcategoryFields from "@/components/post/CategorySubcategoryFields";
import AvailabilityLanguageMobilityFields from "@/components/post/AvailabilityLanguageMobilityFields";
import OneTimeCheckbox from "@/components/post/OneTimeCheckbox";
import FormSubmitButton from "@/components/post/FormSubmitButton";
import PostConfirmModal from "@/components/post/PostConfirmModal";
import PostSelect from "@/components/post/PostSelect";
import type { ListingTranslationsPayload } from "@/lib/serviceListingI18n";
import BilingualListingFields, {
  hasRequiredBilingualFields,
  finalizeListingPayload,
  canonicalFromTranslations,
} from "@/components/post/BilingualListingFields";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { PricingMode } from "@/lib/listingPrice";
import { formatListingPriceLine, type ListingPricingFields } from "@/lib/listingPrice";
import { cn } from "@/lib/utils";

const urgencyLevels = [
  { value: "anytime", labelKey: "post.urgencyAnytime" },
  { value: "few-days", labelKey: "post.urgencyFewDays" },
  { value: "today", labelKey: "post.urgencyToday" },
  { value: "urgent", labelKey: "post.urgencyUrgent" },
];

interface Props {
  onSuccess: (id: string) => void;
}

export default function LookingForWorkerForm({ onSuccess }: Props) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const router = useRouter();
  const urgencyOptions = urgencyLevels.map((level) => ({
    value: level.value,
    label: t(level.labelKey),
  }));

  const [translations, setTranslations] = useState<ListingTranslationsPayload>({
    title: {},
    description: {},
  });
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [pricingMode, setPricingMode] = useState<PricingMode>("fixed");
  const [budget, setBudget] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [location, setLocation] = useState("");
  const [locationDetails, setLocationDetails] = useState<LocationDetails | null>(null);
  const [urgency, setUrgency] = useState("");
  const [posterType, setPosterType] = useState("");
  const [availability, setAvailability] = useState("");
  const [language, setLanguage] = useState("");
  const [mobility, setMobility] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isOneTime, setIsOneTime] = useState(false);
  const [hideExactLocation, setHideExactLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const finalized = finalizeListingPayload(translations);
  const canonical = canonicalFromTranslations(finalized);
  function jobPricingFields(): ListingPricingFields {
    if (pricingMode === "quote") return { pricing_mode: "quote" };
    if (pricingMode === "fixed") {
      const p = Number(budget);
      return { pricing_mode: "fixed", price: Number.isFinite(p) ? p : null };
    }
    const lo = Number(budgetMin);
    const hi = Number(budgetMax);
    return {
      pricing_mode: "range",
      price_min: Number.isFinite(lo) ? lo : null,
      price_max: Number.isFinite(hi) ? hi : null,
      price: Number.isFinite(lo) ? lo : null,
    };
  }

  const pricingOk =
    pricingMode === "quote" ||
    (pricingMode === "fixed" && budget.trim() !== "" && Number(budget) >= 0.01) ||
    (pricingMode === "range" &&
      budgetMin.trim() !== "" &&
      budgetMax.trim() !== "" &&
      Number(budgetMin) >= 0.01 &&
      Number(budgetMax) >= Number(budgetMin));

  const confirmPriceSummary =
    pricingMode === "quote"
      ? t("post.pricingModeQuote")
      : formatListingPriceLine(t, jobPricingFields());

  const isValid =
    hasRequiredBilingualFields(translations) &&
    category.trim() !== "" &&
    pricingOk &&
    location.trim() !== "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) {
      toast.error(t("post.mustBeLoggedInJob"));
      router.push("/login");
      return;
    }
    setConfirmOpen(true);
  };

  const doSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session!.access_token}`,
        },
        body: JSON.stringify({
          type: "looking",
          title: canonical.title,
          description: canonical.description,
          translations: finalized,
          category,
          category_id: null,
          subcategory,
          ...jobPricingFields(),
          location,
          address: locationDetails?.address ?? location,
          latitude: locationDetails?.lat ?? null,
          longitude: locationDetails?.lng ?? null,
          city: locationDetails?.city ?? location,
          poster_type: posterType,
          availability,
          language,
          mobility,
          duration: null,
          urgency,
          image_url: images[0] ?? null,
          image_urls: images,
          is_one_time: isOneTime,
          hide_exact_location: hideExactLocation,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create job request");
      }
      const data = await res.json();
      setConfirmOpen(false);
      onSuccess(data.id);
    } catch (error: unknown) {
      toast.error(t("post.failedPostJob", { message: error instanceof Error ? error.message : String(error) }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-6">
      <BilingualListingFields value={translations} onChange={setTranslations} mode="looking" />

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
          {t("post.budget")} <span className="text-red-500">*</span>
        </Label>
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
            <Input
              type="number"
              placeholder={t("post.amount")}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              required={pricingMode === "fixed"}
              min="0"
              step="0.01"
              className="h-12 pl-8"
            />
          </div>
        </div>
        {budget && Number(budget) < 0.01 && (
          <p className="text-red-600 text-sm">{t("post.budgetMustBePositive")}</p>
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
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
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
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              min="0"
              step="0.01"
              className="h-12 pl-8"
            />
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-500">{t("post.pricingRangeHint")}</p>
      {budgetMin && budgetMax && Number(budgetMax) < Number(budgetMin) && (
        <p className="text-red-600 text-sm">{t("post.invalidPriceRange")}</p>
      )}
      </>
      )}

      <div className="space-y-2">
        <Label htmlFor="jobLocation" className="text-base font-medium text-gray-900">
          {t("post.location")} <span className="text-red-500">*</span>
        </Label>
        <LocationAutocomplete
          id="jobLocation"
          value={location}
          onChange={(val, details) => { setLocation(val); setLocationDetails(details ?? null); }}
          placeholder={t("post.locationPlaceholder")}
          required
        />
      </div>

      <div className="space-y-2">
        <Label className="text-base font-medium text-gray-900">{t("post.urgencyLevel")}</Label>
        <PostSelect
          value={urgency}
          onValueChange={setUrgency}
          placeholder={t("post.selectUrgency")}
          options={urgencyOptions}
        />
      </div>

      <div className="flex items-start gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg">
        <input
          type="checkbox"
          id="jobHideLocation"
          checked={hideExactLocation}
          onChange={(e) => setHideExactLocation(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 cursor-pointer"
        />
        <label htmlFor="jobHideLocation" className="cursor-pointer">
          <span className="text-sm font-medium text-gray-800">{t("post.hideExactLocation")}</span>
          <p className="text-xs text-gray-500 mt-0.5">{t("post.hideExactLocationDesc")}</p>
        </label>
      </div>

      <CategorySubcategoryFields
        category={category}
        subcategory={subcategory}
        posterType={posterType}
        onCategoryChange={setCategory}
        onSubcategoryChange={setSubcategory}
        onPosterTypeChange={setPosterType}
        categoryRequired
      />

      <AvailabilityLanguageMobilityFields
        availability={availability}
        language={language}
        mobility={mobility}
        onAvailabilityChange={setAvailability}
        onLanguageChange={setLanguage}
        onMobilityChange={setMobility}
      />

      <div className="space-y-2">
        <Label className="text-base font-medium text-gray-900">{t("post.uploadImage")}</Label>
        <MultiImageUploader images={images} onChange={setImages} aspectRatio={16 / 9} />
      </div>

      <OneTimeCheckbox id="jobIsOneTime" checked={isOneTime} onChange={setIsOneTime} />

      <FormSubmitButton
        disabled={!isValid}
        submitting={submitting}
        label={t("post.postJobRequest")}
        note={t("post.jobPublicNote")}
      />
    </form>

    <PostConfirmModal
      open={confirmOpen}
      type="looking"
      title={canonical.title}
      priceSummary={confirmPriceSummary}
      location={location}
      category={category}
      subcategory={subcategory}
      submitting={submitting}
      onConfirm={doSubmit}
      onCancel={() => setConfirmOpen(false)}
    />
    </>
  );
}
