"use client";

import { useState } from "react";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import MultiImageUploader from "@/components/ui/MultiImageUploader";
import LocationAutocomplete, { type LocationDetails } from "@/components/post/LocationAutocomplete";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { categories } from "@/lib/categories";
import { X, CheckCircle } from "lucide-react";

export interface Service {
  id: string;
  type: "offer" | "looking";
  title: string;
  description: string;
  price: string | number;
  location: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  category: string | null;
  category_id?: number | null;
  subcategory: string | null;
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
}

interface Props {
  service: Service;
  accessToken: string;
  onClose: () => void;
  onSaved: (updated: Service) => void;
}

export default function EditListingModal({ service, accessToken, onClose, onSaved }: Props) {
  useScrollLock(true);
  const { t } = useTranslation();

  const [title, setTitle] = useState(service.title);
  const [description, setDescription] = useState(service.description);
  const [price, setPrice] = useState(String(service.price));
  const [location, setLocation] = useState(service.location);
  const [locationDetails, setLocationDetails] = useState<LocationDetails | null>(
    service.latitude != null && service.longitude != null
      ? { address: service.address ?? service.location, lat: service.latitude, lng: service.longitude, city: service.city ?? service.location }
      : null
  );
  const [category, setCategory] = useState(service.category ?? "");
  const [subcategory, setSubcategory] = useState(service.subcategory ?? "");
  const [posterType, setPosterType] = useState(service.poster_type ?? "");
  const [availability, setAvailability] = useState(service.availability ?? "");
  const [language, setLanguage] = useState(service.language ?? "");
  const [mobility, setMobility] = useState(service.mobility ?? "");
  const [duration, setDuration] = useState(service.duration ?? "");
  const [urgency, setUrgency] = useState(service.urgency ?? "");
  const [images, setImages] = useState<string[]>(
    service.image_urls?.length ? service.image_urls : service.image_url ? [service.image_url] : []
  );
  const [isOneTime, setIsOneTime] = useState(service.is_one_time ?? false);
  const [hideExactLocation, setHideExactLocation] = useState(service.hide_exact_location ?? false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const isOffer = service.type === "offer";

  const isValid =
    title.trim() !== "" &&
    description.trim() !== "" &&
    category.trim() !== "" &&
    price.trim() !== "" &&
    Number(price) > 0 &&
    location.trim() !== "";

  const handleSave = async () => {
    if (!isValid) {
      setError(t("serviceDetail.requiredFields"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/services/${service.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            price: parseFloat(price),
            location: location.trim(),
            address: locationDetails?.address ?? location.trim(),
            latitude: locationDetails?.lat ?? null,
            longitude: locationDetails?.lng ?? null,
            city: locationDetails?.city ?? location.trim(),
            category: category || null,
            subcategory: subcategory || null,
            poster_type: posterType || null,
            availability: availability || null,
            language: language || null,
            mobility: mobility || null,
            duration: duration || null,
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

  const selectedCat = categories.find((c) => c.name === category);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-none bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl">
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
        <div className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-6 py-5">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label className="text-base font-medium text-gray-900">
              {isOffer ? t("post.serviceTitle") : t("post.jobTitle")} <span className="text-red-500">*</span>
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isOffer ? t("post.serviceTitlePlaceholder") : t("post.jobTitlePlaceholder")}
              className="h-12"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-base font-medium text-gray-900">
              {t("post.description")} <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isOffer ? t("post.descriptionPlaceholder") : t("post.jobDescriptionPlaceholder")}
              className="min-h-32 resize-none"
            />
          </div>

          {/* Price */}
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
                className="h-12 pl-8"
              />
            </div>
            {price && Number(price) <= 0 && (
              <p className="text-red-600 text-sm">{t("post.priceMustBePositive")}</p>
            )}
          </div>

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
          </div>

          {/* Urgency — looking only */}
          {!isOffer && (
            <div className="space-y-2">
              <Label className="text-base font-medium text-gray-900">{t("post.urgencyLevel")}</Label>
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger className="h-12 cursor-pointer">
                  <SelectValue placeholder={t("post.selectUrgency")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anytime" className="cursor-pointer">{t("post.urgencyAnytime")}</SelectItem>
                  <SelectItem value="few-days" className="cursor-pointer">{t("post.urgencyFewDays")}</SelectItem>
                  <SelectItem value="today" className="cursor-pointer">{t("post.urgencyToday")}</SelectItem>
                  <SelectItem value="urgent" className="cursor-pointer">{t("post.urgencyUrgent")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Category / Subcategory / Poster type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-base font-medium text-gray-900">
                {t("post.category")} <span className="text-red-500">*</span>
              </Label>
              <Select value={category} onValueChange={(v) => { setCategory(v); setSubcategory(""); }}>
                <SelectTrigger className="h-12 cursor-pointer">
                  <SelectValue placeholder={t("post.selectCategory")} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.name} value={cat.name} className="cursor-pointer">
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium text-gray-900">{t("post.subcategory")}</Label>
              <Select value={subcategory} onValueChange={setSubcategory} disabled={!category}>
                <SelectTrigger className="h-12 cursor-pointer">
                  <SelectValue placeholder={t("post.selectSubcategory")} />
                </SelectTrigger>
                <SelectContent>
                  {selectedCat?.subcategories?.map((sub) => (
                    <SelectItem key={sub} value={sub} className="cursor-pointer">
                      {sub}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium text-gray-900">{t("post.typeOfPoster")}</Label>
              <Select value={posterType} onValueChange={setPosterType}>
                <SelectTrigger className="h-12 cursor-pointer">
                  <SelectValue placeholder={t("post.selectPosterType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual" className="cursor-pointer">{t("post.individual")}</SelectItem>
                  <SelectItem value="company" className="cursor-pointer">{t("post.company")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Availability / Language / Mobility */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-base font-medium text-gray-900">{t("post.availability")}</Label>
              <Select value={availability} onValueChange={setAvailability}>
                <SelectTrigger className="h-12 cursor-pointer">
                  <SelectValue placeholder={t("post.selectAvailability")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anytime" className="cursor-pointer">{t("post.urgencyAnytime")}</SelectItem>
                  <SelectItem value="weekends" className="cursor-pointer">{t("post.availabilityWeekends")}</SelectItem>
                  <SelectItem value="weekdays" className="cursor-pointer">{t("post.availabilityWeekdays")}</SelectItem>
                  <SelectItem value="evenings" className="cursor-pointer">{t("post.availabilityEvenings")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium text-gray-900">{t("post.spokenLanguage")}</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-12 cursor-pointer">
                  <SelectValue placeholder={t("post.preferredLanguage")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="french" className="cursor-pointer">{t("post.languageFrench")}</SelectItem>
                  <SelectItem value="english" className="cursor-pointer">{t("post.languageEnglish")}</SelectItem>
                  <SelectItem value="bilingual" className="cursor-pointer">{t("post.languageBilingual")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium text-gray-900">{t("post.mobility")}</Label>
              <Select value={mobility} onValueChange={setMobility}>
                <SelectTrigger className="h-12 cursor-pointer">
                  <SelectValue placeholder={t("post.canYouTravel")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes" className="cursor-pointer">{t("post.mobilityYes")}</SelectItem>
                  <SelectItem value="no" className="cursor-pointer">{t("post.mobilityNo")}</SelectItem>
                  <SelectItem value="limited" className="cursor-pointer">{t("post.mobilityLimited")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label className="text-base font-medium text-gray-900">{t("post.jobDuration")}</Label>
            <Input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder={t("post.jobDurationPlaceholder")}
              className="h-12"
            />
          </div>

          {/* Images */}
          <div className="space-y-2">
            <Label className="text-base font-medium text-gray-900">{t("serviceDetail.photos")}</Label>
            <MultiImageUploader images={images} onChange={setImages} aspectRatio={16 / 9} />
          </div>

          {/* Hide exact location */}
          <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
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
