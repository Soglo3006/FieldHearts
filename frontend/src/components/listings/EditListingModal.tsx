"use client";

import { useState } from "react";
import { useScrollLock } from "@/hooks/useScrollLock";
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

const URGENCY_LEVELS = [
  { value: "anytime", label: "Anytime" },
  { value: "few-days", label: "Within a few days" },
  { value: "today", label: "Today" },
  { value: "urgent", label: "Urgent" },
];

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
      setError("Title, description, category, price, and location are required.");
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
        setError(data.message ?? "Failed to update. Please try again.");
        return;
      }
      const updated = await res.json();
      setSuccess(true);
      setTimeout(() => {
        onSaved(updated);
        onClose();
      }, 800);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const selectedCat = categories.find((c) => c.name === category);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Edit Listing</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isOffer ? "Offer a Service" : "Looking for a Worker"}
            </p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="cursor-pointer text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label className="text-base font-medium text-gray-900">
              {isOffer ? "Service Title" : "Job Title"} <span className="text-red-500">*</span>
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isOffer ? "Ex: Professional House Cleaning" : "Ex: Need help moving furniture"}
              className="h-12"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-base font-medium text-gray-900">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isOffer ? "Describe the service you offer…" : "Describe what kind of worker you're looking for…"}
              className="min-h-32 resize-none"
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label className="text-base font-medium text-gray-900">
              {isOffer ? "Price" : "Budget"} <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Amount"
                min="0"
                className="h-12 pl-8"
              />
            </div>
            {price && Number(price) <= 0 && (
              <p className="text-red-600 text-sm">Price must be greater than zero.</p>
            )}
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label className="text-base font-medium text-gray-900">
              Location <span className="text-red-500">*</span>
            </Label>
            <LocationAutocomplete
              value={location}
              onChange={(val, details) => { setLocation(val); setLocationDetails(details ?? null); }}
              placeholder="City, region (ex: Toronto, ON)"
            />
          </div>

          {/* Urgency — looking only */}
          {!isOffer && (
            <div className="space-y-2">
              <Label className="text-base font-medium text-gray-900">Urgency Level</Label>
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger className="h-12 cursor-pointer">
                  <SelectValue placeholder="Select urgency level" />
                </SelectTrigger>
                <SelectContent>
                  {URGENCY_LEVELS.map((u) => (
                    <SelectItem key={u.value} value={u.value} className="cursor-pointer">
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Category / Subcategory / Poster type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-base font-medium text-gray-900">
                Category <span className="text-red-500">*</span>
              </Label>
              <Select value={category} onValueChange={(v) => { setCategory(v); setSubcategory(""); }}>
                <SelectTrigger className="h-12 cursor-pointer">
                  <SelectValue placeholder="Select a category" />
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
              <Label className="text-base font-medium text-gray-900">Subcategory</Label>
              <Select value={subcategory} onValueChange={setSubcategory} disabled={!category}>
                <SelectTrigger className="h-12 cursor-pointer">
                  <SelectValue placeholder="Select a subcategory" />
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
              <Label className="text-base font-medium text-gray-900">Type of Poster</Label>
              <Select value={posterType} onValueChange={setPosterType}>
                <SelectTrigger className="h-12 cursor-pointer">
                  <SelectValue placeholder="Individual or Company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual" className="cursor-pointer">Individual</SelectItem>
                  <SelectItem value="company" className="cursor-pointer">Company</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Availability / Language / Mobility */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-base font-medium text-gray-900">Availability</Label>
              <Select value={availability} onValueChange={setAvailability}>
                <SelectTrigger className="h-12 cursor-pointer">
                  <SelectValue placeholder="Select availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anytime" className="cursor-pointer">Anytime</SelectItem>
                  <SelectItem value="weekends" className="cursor-pointer">Weekends</SelectItem>
                  <SelectItem value="weekdays" className="cursor-pointer">Weekdays</SelectItem>
                  <SelectItem value="evenings" className="cursor-pointer">Evenings</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium text-gray-900">Spoken Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-12 cursor-pointer">
                  <SelectValue placeholder="Preferred language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="french" className="cursor-pointer">French</SelectItem>
                  <SelectItem value="english" className="cursor-pointer">English</SelectItem>
                  <SelectItem value="bilingual" className="cursor-pointer">Bilingual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium text-gray-900">Mobility</Label>
              <Select value={mobility} onValueChange={setMobility}>
                <SelectTrigger className="h-12 cursor-pointer">
                  <SelectValue placeholder="Can you travel?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes" className="cursor-pointer">Yes</SelectItem>
                  <SelectItem value="no" className="cursor-pointer">No</SelectItem>
                  <SelectItem value="limited" className="cursor-pointer">Limited distance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label className="text-base font-medium text-gray-900">Approx. Job Duration</Label>
            <Input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Ex: 2 hours, 1 day, 1 week"
              className="h-12"
            />
          </div>

          {/* Images */}
          <div className="space-y-2">
            <Label className="text-base font-medium text-gray-900">Photos (optionnel)</Label>
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
              <span className="text-sm font-medium text-gray-800">Hide exact location</span>
              <p className="text-xs text-gray-500 mt-0.5">
                Only a general area will be shown on the map. The exact address remains private.
              </p>
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
              <span className="text-sm font-medium text-green-800">One-time listing</span>
              <p className="text-xs text-green-700 mt-0.5">
                Once a request is accepted, this listing will be hidden and all other pending requests will be automatically declined.
              </p>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            className="bg-green-700 hover:bg-green-800 text-white min-w-32"
            onClick={handleSave}
            disabled={saving || !isValid}
          >
            {success ? (
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Saved!
              </span>
            ) : saving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving…
              </span>
            ) : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
