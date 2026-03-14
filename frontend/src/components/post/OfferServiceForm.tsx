"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import ImageUploader from "@/components/ui/ImageUploader";
import LocationAutocomplete, { type LocationDetails } from "@/components/post/LocationAutocomplete";
import CategorySubcategoryFields from "@/components/post/CategorySubcategoryFields";
import AvailabilityLanguageMobilityFields from "@/components/post/AvailabilityLanguageMobilityFields";
import OneTimeCheckbox from "@/components/post/OneTimeCheckbox";
import FormSubmitButton from "@/components/post/FormSubmitButton";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Props {
  onSuccess: (id: string) => void;
}

export default function OfferServiceForm({ onSuccess }: Props) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [locationDetails, setLocationDetails] = useState<LocationDetails | null>(null);
  const [posterType, setPosterType] = useState("");
  const [availability, setAvailability] = useState("");
  const [language, setLanguage] = useState("");
  const [mobility, setMobility] = useState("");
  const [duration, setDuration] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [isOneTime, setIsOneTime] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isValid =
    title.trim() !== "" &&
    description.trim() !== "" &&
    category.trim() !== "" &&
    price.trim() !== "" &&
    Number(price) > 0 &&
    location.trim() !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) {
      toast.error(t("post.mustBeLoggedInService"));
      router.push("/login");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: "offer",
          title,
          description,
          category,
          category_id: null,
          subcategory,
          price: parseFloat(price),
          location,
          address: locationDetails?.address ?? location,
          latitude: locationDetails?.lat ?? null,
          longitude: locationDetails?.lng ?? null,
          city: locationDetails?.city ?? location,
          poster_type: posterType,
          availability,
          language,
          mobility,
          duration,
          image_url: image,
          is_one_time: isOneTime,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create service");
      }
      const data = await res.json();
      onSuccess(data.id);
    } catch (error: unknown) {
      toast.error(t("post.failedPostService", { message: error instanceof Error ? error.message : String(error) }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="serviceTitle" className="text-base font-medium text-gray-900">
          {t("post.serviceTitle")} <span className="text-red-500">*</span>
        </Label>
        <Input
          id="serviceTitle"
          type="text"
          placeholder={t("post.serviceTitlePlaceholder")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="h-12"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="serviceDescription" className="text-base font-medium text-gray-900">
          {t("post.description")} <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="serviceDescription"
          placeholder={t("post.descriptionPlaceholder")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className="min-h-32 resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-base font-medium text-gray-900">
          {t("post.priceRange")} <span className="text-red-500">*</span>
        </Label>
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
            <Input
              type="number"
              placeholder={t("post.amount")}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              min="0"
              className="h-12 pl-8"
            />
          </div>
        </div>
        {price && Number(price) <= 0 && (
          <p className="text-red-600 text-sm">{t("post.priceMustBePositive")}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="serviceLocation" className="text-base font-medium text-gray-900">
          {t("post.location")} <span className="text-red-500">*</span>
        </Label>
        <LocationAutocomplete
          id="serviceLocation"
          value={location}
          onChange={(val, details) => { setLocation(val); setLocationDetails(details ?? null); }}
          placeholder={t("post.locationPlaceholder")}
          required
        />
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
        <Label className="text-base font-medium text-gray-900">{t("post.jobDuration")}</Label>
        <Input
          type="text"
          placeholder={t("post.jobDurationPlaceholder")}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="h-12"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-base font-medium text-gray-900">{t("post.uploadImage")}</Label>
        <ImageUploader
          currentImage={image}
          onImageChange={setImage}
          label={t("post.uploadServiceImage")}
          aspectRatio={16 / 9}
        />
      </div>

      <OneTimeCheckbox id="serviceIsOneTime" checked={isOneTime} onChange={setIsOneTime} />

      <FormSubmitButton
        disabled={!isValid}
        submitting={submitting}
        label={t("post.postService")}
        note={t("post.servicePublicNote")}
      />
    </form>
  );
}
