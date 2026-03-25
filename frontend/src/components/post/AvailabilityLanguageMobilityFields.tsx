"use client";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

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
  return (
    <div className="pb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label className="text-base font-medium text-gray-900">{t("post.availability")}</Label>
          <Select value={availability} onValueChange={onAvailabilityChange}>
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
          <Select value={language} onValueChange={onLanguageChange}>
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
          <Select value={mobility} onValueChange={onMobilityChange}>
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
    </div>
  );
}
