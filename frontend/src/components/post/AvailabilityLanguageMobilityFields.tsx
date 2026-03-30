"use client";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import PostSelect from "@/components/post/PostSelect";

interface Props {
  availability: string;
  language: string;
  mobility: string;
  onAvailabilityChange: (v: string) => void;
  onLanguageChange: (v: string) => void;
  onMobilityChange: (v: string) => void;
}

export default function AvailabilityLanguageMobilityFields({
  availability, language, mobility,
  onAvailabilityChange, onLanguageChange, onMobilityChange,
}: Props) {
  const { t } = useTranslation();
  const availabilityOptions = [
    { value: "anytime", label: t("post.urgencyAnytime") },
    { value: "weekends", label: t("post.availabilityWeekends") },
    { value: "weekdays", label: t("post.availabilityWeekdays") },
    { value: "evenings", label: t("post.availabilityEvenings") },
  ];
  const languageOptions = [
    { value: "french", label: t("post.languageFrench") },
    { value: "english", label: t("post.languageEnglish") },
    { value: "bilingual", label: t("post.languageBilingual") },
  ];
  const mobilityOptions = [
    { value: "yes", label: t("post.mobilityYes") },
    { value: "no", label: t("post.mobilityNo") },
    { value: "limited", label: t("post.mobilityLimited") },
  ];

  return (
    <div className="pb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label className="text-base font-medium text-gray-900">{t("post.availability")}</Label>
          <PostSelect
            value={availability}
            onValueChange={onAvailabilityChange}
            placeholder={t("post.selectAvailability")}
            options={availabilityOptions}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium text-gray-900">{t("post.spokenLanguage")}</Label>
          <PostSelect
            value={language}
            onValueChange={onLanguageChange}
            placeholder={t("post.preferredLanguage")}
            options={languageOptions}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium text-gray-900">{t("post.mobility")}</Label>
          <PostSelect
            value={mobility}
            onValueChange={onMobilityChange}
            placeholder={t("post.canYouTravel")}
            options={mobilityOptions}
          />
        </div>
      </div>
    </div>
  );
}
