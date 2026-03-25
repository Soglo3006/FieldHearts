"use client";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProfilePictureUploader from "@/components/profile/ProfilePicture";
import { OnboardingData } from "./onboardingTypes";
import AddressAutocomplete from "@/components/ui/AddressAutocomplete";

interface Props {
  data: OnboardingData;
  accountType: string;
  onChange: (patch: Partial<OnboardingData>) => void;
}

export default function StepBasicInfo({ data, accountType, onChange }: Props) {
  const { t } = useTranslation();

  const handlePhone = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/\D/g, "");
    if (input.length > 3 && input.length <= 6) input = input.replace(/(\d{3})(\d+)/, "$1-$2");
    else if (input.length > 6) input = input.replace(/(\d{3})(\d{3})(\d+)/, "$1-$2-$3");
    onChange({ phone: input });
  };

  return (
    <Card className="p-6 sm:p-8 animate-in fade-in duration-300">
      <h2 className="text-xl font-bold text-gray-900 mb-0">{t("onboarding.basicInfoTitle")}</h2>
      <p className="text-gray-600">{t("onboarding.welcomeSubtitle")}</p>

      <div className="space-y-6">
        {accountType === "person" && (
          <div>
            <div className="flex flex-col items-center">
              <ProfilePictureUploader
                currentProfilePicture={data.avatar}
                userName={data.fullName || ""}
                onProfileChange={(pic) => onChange({ avatar: pic })}
                size="xl"
                showLabel={true}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-base font-medium text-gray-900">{t("profileEdit.fullName")}</Label>
              <Input
                id="fullName"
                type="text"
                value={data.fullName || ""}
                onChange={(e) => onChange({ fullName: e.target.value })}
                className="h-12"
              />
            </div>
          </div>
        )}

        {accountType === "company" && (
          <div>
            <div className="flex flex-col items-center">
              <ProfilePictureUploader
                currentProfilePicture={data.avatar}
                userName={data.companyName || ""}
                onProfileChange={(pic) => onChange({ avatar: pic })}
                size="xl"
                showLabel={true}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-base font-medium text-gray-900">{t("profileEdit.companyName")} <span className="text-red-500">*</span></Label>
              <Input
                id="companyName"
                type="text"
                value={data.companyName || ""}
                onChange={(e) => onChange({ companyName: e.target.value })}
                className="h-12"
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" className="text-base font-medium text-gray-900">
            {accountType === "company" ? t("support.email") : t("login.email")}
          </Label>
          <Input id="email" type="email" value={data.email} disabled className="h-12 bg-gray-50 cursor-not-allowed" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="text-base font-medium text-gray-900">
            {t("profileEdit.phone")} <span className="text-red-500">*</span>
          </Label>
          <Input id="phone" type="tel" placeholder="123-456-7890" value={data.phone} onChange={handlePhone} maxLength={12} className="h-12" />
        </div>


        {/* Address autocomplete */}
        <div className="space-y-2">
          <Label htmlFor="adresse" className="text-base font-medium text-gray-900">
            Adresse <span className="text-red-500">*</span>
          </Label>
          <AddressAutocomplete
            id="adresse"
            value={data.adresse}
            onChange={(raw) => onChange({ adresse: raw })}
            onSelect={(result) =>
              onChange({
                adresse: result.adresse,
                ville: result.ville,
                province: result.province,
              })
            }
            placeholder="ex : 123 Rue Principale, Montréal"
          />
          <p className="text-xs text-gray-400">{t("onboarding.addressHint", "Commence à taper pour voir les suggestions")}</p>
        </div>

        {/* City + Province auto-filled, still editable */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ville" className="text-base font-medium text-gray-900">
              Ville <span className="text-red-500">*</span>
            </Label>
            <Input
              id="ville"
              type="text"
              placeholder="Montréal"
              value={data.ville}
              onChange={(e) => onChange({ ville: e.target.value })}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="province" className="text-base font-medium text-gray-900">
              Province <span className="text-red-500">*</span>
            </Label>
            <Input
              id="province"
              type="text"
              placeholder="Québec"
              value={data.province}
              onChange={(e) => onChange({ province: e.target.value })}
              className="h-12"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
