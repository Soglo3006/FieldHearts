"use client";
import { useState } from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MultiImageUploader from "@/components/ui/MultiImageUploader";
import MultiLocationFields, {
  createEmptyLocationEntry,
  locationsFromEntries,
  type LocationEntry,
} from "@/components/post/MultiLocationFields";
import CategorySubcategoryFields from "@/components/post/CategorySubcategoryFields";
import { formatListingTagsDisplay } from "@/lib/categories";
import AvailabilityLanguageMobilityFields from "@/components/post/AvailabilityLanguageMobilityFields";
import OneTimeCheckbox from "@/components/post/OneTimeCheckbox";
import ListingVisibilityCheckbox from "@/components/post/ListingVisibilityCheckbox";
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
import type { DepositType } from "@/lib/deposit";
import { resolveDepositBaseAmount, isDepositFormValueValid } from "@/lib/deposit";
import DepositFields from "@/components/post/DepositFields";
import {
  labelAvailability,
  labelSpokenLanguage,
  labelMobility,
  labelUrgency,
} from "@/lib/postFormConfirmLabels";

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
  const [tags, setTags] = useState<string[]>([]);
  const [pricingMode, setPricingMode] = useState<PricingMode>("fixed");
  const [budget, setBudget] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [locationEntries, setLocationEntries] = useState<LocationEntry[]>([createEmptyLocationEntry()]);
  const [urgency, setUrgency] = useState("");
  const [availability, setAvailability] = useState("");
  const [language, setLanguage] = useState("");
  const [mobility, setMobility] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isOneTime, setIsOneTime] = useState(false);
  const [hideExactLocation, setHideExactLocation] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [depositEnabled, setDepositEnabled] = useState(false);
  const [depositType, setDepositType] = useState<DepositType>("fixed");
  const [depositValue, setDepositValue] = useState("");
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
    if (pricingMode === "hourly") {
      const rate = Number(budget);
      const hours = Number(estimatedHours);
      return {
        pricing_mode: "hourly",
        price: Number.isFinite(rate) ? rate : null,
        estimated_hours: Number.isFinite(hours) && hours > 0 ? hours : null,
      };
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
    (pricingMode === "hourly" && budget.trim() !== "" && Number(budget) >= 0.01) ||
    (pricingMode === "range" &&
      budgetMin.trim() !== "" &&
      budgetMax.trim() !== "" &&
      Number(budgetMin) >= 0.01 &&
      Number(budgetMax) >= Number(budgetMin));

  const depositBase = resolveDepositBaseAmount(jobPricingFields(), null);

  const depositOk = isDepositFormValueValid(depositEnabled, depositType, depositValue, jobPricingFields());

  const confirmPriceSummary =
    pricingMode === "quote"
      ? t("post.pricingModeQuote")
      : formatListingPriceLine(t, jobPricingFields());

  const resolvedLocations = locationsFromEntries(locationEntries);
  const primaryLocation = resolvedLocations[0];
  const locationOk = resolvedLocations.length >= 1;

  const confirmCategoryLine = category
    ? formatListingTagsDisplay(category, tags, null, t, " · ")
    : "";

  const isValid =
    hasRequiredBilingualFields(translations) &&
    category.trim() !== "" &&
    tags.length >= 1 &&
    pricingOk &&
    locationOk &&
    depositOk;

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
          listing_tags: tags,
          subcategory: tags[0] ?? null,
          ...jobPricingFields(),
          locations: resolvedLocations,
          location: primaryLocation?.location ?? primaryLocation?.address,
          address: primaryLocation?.address,
          latitude: primaryLocation?.lat ?? null,
          longitude: primaryLocation?.lng ?? null,
          city: primaryLocation?.city,
          availability,
          language,
          mobility,
          duration: null,
          urgency,
          image_url: images[0] ?? null,
          image_urls: images,
          is_one_time: isOneTime,
          hide_exact_location: hideExactLocation,
          is_public: isPublic,
          deposit_enabled: depositEnabled,
          deposit_type: depositEnabled ? depositType : null,
          deposit_value: depositEnabled ? Number(depositValue) : null,
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(
            [
              ["fixed", t("post.pricingModeFixed")],
              ["range", t("post.pricingModeRange")],
              ["hourly", t("post.pricingModeHourly")],
              ["quote", t("post.pricingModeQuote")],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPricingMode(value)}
              className={cn(
                "w-full rounded-lg border px-2 py-2.5 text-sm font-medium transition-colors text-center",
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
              className="h-12 pl-8 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
              className="h-12 pl-8 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
              className="h-12 pl-8 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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

      {pricingMode === "hourly" && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex-1 space-y-2">
            <Label className="text-base font-medium text-gray-900">
              {t("post.hourlyRateLabel")} <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
              <Input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                min="0.01"
                step="0.01"
                placeholder="25.00"
                className="h-10 pl-8 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <Label className="text-base font-medium text-gray-900">{t("post.estimatedHoursLabel")}</Label>
            <Input
              type="number"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              min="0.25"
              step="0.25"
              placeholder="2"
              className="h-10 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <p className="text-xs text-gray-500">{t("post.estimatedHoursHint")}</p>
          </div>
        </div>
      )}

      <DepositFields
        enabled={depositEnabled}
        onEnabledChange={setDepositEnabled}
        type={depositType}
        onTypeChange={setDepositType}
        value={depositValue}
        onValueChange={setDepositValue}
        pricingMode={pricingMode}
        servicePrice={depositBase}
        pricingFields={jobPricingFields()}
      />

      <div className="space-y-2">
        <Label htmlFor="jobLocation" className="text-base font-medium text-gray-900">
          {t("post.location")} <span className="text-red-500">*</span>
        </Label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex-1 min-w-0 space-y-1">
            <MultiLocationFields
              idPrefix="jobLocation"
              entries={locationEntries}
              onChange={setLocationEntries}
              required
            />
            <p className="text-xs text-gray-500">{t("post.locationPickerHint")}</p>
          </div>
          <div className="flex w-full items-center gap-3 px-4 h-10 bg-white border border-gray-200 rounded-lg sm:w-56 sm:shrink-0">
            <input
              type="checkbox"
              id="jobHideLocation"
              checked={hideExactLocation}
              onChange={(e) => setHideExactLocation(e.target.checked)}
              className="h-4 w-4 shrink-0 rounded border-gray-300 text-green-600 cursor-pointer"
            />
            <div className="flex items-center gap-1">
              <label htmlFor="jobHideLocation" className="cursor-pointer text-xs font-medium text-gray-800">
                {t("post.hideExactLocation")}
              </label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" aria-label={t("post.hideExactLocationDesc")} className="flex items-center text-gray-400 hover:text-gray-600">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-center">
                  {t("post.hideExactLocationDesc")}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

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

      <CategorySubcategoryFields
        category={category}
        tags={tags}
        onCategoryChange={setCategory}
        onTagsChange={setTags}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <OneTimeCheckbox id="jobIsOneTime" checked={isOneTime} onChange={setIsOneTime} />
        <ListingVisibilityCheckbox id="jobIsPublic" isPublic={isPublic} onChange={setIsPublic} />
      </div>

      <FormSubmitButton
        disabled={!isValid}
        submitting={submitting}
        label={t("post.postJobRequest")}
        note={isPublic ? t("post.jobPublicNote") : t("post.jobPrivateNote")}
      />
    </form>

    <PostConfirmModal
      open={confirmOpen}
      type="looking"
      titlesByLang={finalized.title ?? {}}
      descriptionsByLang={finalized.description ?? {}}
      priceSummary={confirmPriceSummary}
      location={
        resolvedLocations.length > 1
          ? `${primaryLocation?.location ?? primaryLocation?.address ?? ""} (+${resolvedLocations.length - 1})`
          : (locationEntries[0]?.value ?? primaryLocation?.location ?? primaryLocation?.address ?? "")
      }
      hideExactLocation={hideExactLocation}
      categoryLine={confirmCategoryLine}
      availabilityLabel={labelAvailability(t, availability)}
      spokenLanguageLabel={labelSpokenLanguage(t, language)}
      mobilityLabel={labelMobility(t, mobility)}
      urgencyLabel={labelUrgency(t, urgency)}
      isOneTime={isOneTime}
      imageUrls={images}
      submitting={submitting}
      onConfirm={doSubmit}
      onCancel={() => setConfirmOpen(false)}
    />
    </>
  );
}
