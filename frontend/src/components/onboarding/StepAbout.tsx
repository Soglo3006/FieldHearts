"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { OnboardingData, professionSuggestions } from "./onboardingTypes";

interface Props {
  data: OnboardingData;
  accountType: string;
  onChange: (patch: Partial<OnboardingData>) => void;
}

export default function StepAbout({ data, accountType, onChange }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("fr") ? "fr" : "en";
  const [professionInput, setProfessionInput] = useState(data.profession || "");
  const [showSuggestions, setShowSuggestions] = useState(false);

  return (
    <Card className="p-6 sm:p-8 animate-in fade-in duration-300">
      <h2 className="text-xl font-bold text-gray-900">
        {accountType === "company" ? t("onboarding.aboutYourCompany") : t("onboarding.aboutYourself")}
      </h2>
      <p className="text-gray-600">{t("onboarding.aboutSubtitle")}</p>

      <div className="space-y-6">
        {accountType === "person" && (
          <>
            <div className="space-y-2 relative">
              <Label className="text-base font-medium text-gray-900">
                {t("onboarding.profession")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="profession"
                type="text"
                placeholder={t("onboarding.professionPlaceholder")}
                value={professionInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setProfessionInput(v);
                  onChange({ profession: v });
                  setShowSuggestions(!!v.trim());
                }}
                onFocus={() => { if (professionInput.trim()) setShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                className="h-12"
              />
              {showSuggestions && professionInput.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border rounded-md shadow-lg z-20 max-h-38 overflow-y-auto">
                  <div className="px-3 py-1 text-xs text-gray-400 font-medium border-b">{t("onboarding.suggestions")}</div>
                  {(professionSuggestions[lang] ?? professionSuggestions.fr)
                    .filter((p) => p.toLowerCase().includes(professionInput.toLowerCase()))
                    .slice(0, 6)
                    .map((s) => (
                      <div
                        key={s}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                        onMouseDown={() => {
                          setProfessionInput(s);
                          onChange({ profession: s });
                          setShowSuggestions(false);
                        }}
                      >
                        {s}
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="text-base font-medium text-gray-900">
                {t("onboarding.bio")}              </Label>
              <Textarea
                id="bio"
                placeholder={t("onboarding.bioPlaceholder")}
                value={data.bio || ""}
                onChange={(e) => onChange({ bio: e.target.value })}
                className="min-h-40 resize-none"
              />
            </div>
          </>
        )}

        {accountType === "company" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="companyBio" className="text-base font-medium text-gray-900">
                {t("onboarding.companyBio")}              </Label>
              <Textarea
                id="companyBio"
                placeholder={t("onboarding.companyBioPlaceholder")}
                value={data.companyBio || ""}
                onChange={(e) => onChange({ companyBio: e.target.value })}
                className="min-h-40 resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry" className="text-base font-medium text-gray-900">
                {t("onboarding.companyIndustry")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="industry"
                type="text"
                placeholder={t("onboarding.industryPlaceholder")}
                value={data.industry || ""}
                onChange={(e) => onChange({ industry: e.target.value })}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="teamSize" className="text-base font-medium text-gray-900">{t("onboarding.teamSize")}</Label>
              <Input
                id="teamSize"
                type="text"
                placeholder={t("onboarding.teamSizePlaceholder")}
                value={data.teamSize || ""}
                onChange={(e) => onChange({ teamSize: e.target.value })}
                className="h-12"
              />
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
