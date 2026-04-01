"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Trash2 } from "lucide-react";
import { Language, OnboardingData, languageOptions, proficiencyOptions, skillSuggestions, serviceSuggestions } from "./onboardingTypes";
import { getLanguageCode } from "@/lib/locale";

interface Props {
  data: OnboardingData;
  accountType: string;
  onAddSkill: (skill: string) => void;
  onRemoveSkill: (skill: string) => void;
  onAddLanguage: () => void;
  onRemoveLanguage: (id: number) => void;
  onUpdateLanguage: (id: number, field: "language" | "proficiency", value: string) => void;
}

export default function StepSkillsServices({
  data, accountType, onAddSkill, onRemoveSkill,
  onAddLanguage, onRemoveLanguage, onUpdateLanguage,
}: Props) {
  const { t, i18n } = useTranslation();
  const lang = getLanguageCode(i18n.language);
  const [newSkill, setNewSkill] = useState("");
  const suggestionList = accountType === "company"
    ? (serviceSuggestions[lang] ?? serviceSuggestions.fr)
    : (skillSuggestions[lang] ?? skillSuggestions.fr);

  const handleAdd = () => {
    const s = newSkill.trim();
    if (!s || data.skills?.includes(s) || (data.skills?.length ?? 0) >= 10) return;
    onAddSkill(s);
    setNewSkill("");
  };

  return (
    <Card className="p-6 sm:p-8 animate-in fade-in duration-300">
      <h2 className="text-xl font-bold text-gray-900">
        {accountType === "company" ? t("onboarding.yourServices") : t("onboarding.skillsAndServices")}
      </h2>
      <p className="text-gray-600">
        {t("onboarding.skillsSubtitle")}
      </p>

      <div className="space-y-8">
        {/* Skills / Services */}
        <div>
          <Label className="text-base font-medium text-gray-900 mb-1 block">
            {accountType === "company" ? t("onboarding.yourServices") : t("onboarding.yourSkills")} <span className="text-red-500">*</span>
            <span className="text-gray-500 font-normal text-sm ml-2">({data.skills?.length ?? 0}/10)</span>
          </Label>
          <p className="text-xs text-gray-400 mb-3">
            {lang === "fr"
              ? "Vous pouvez écrire votre propre compétence"
              : "You can write your own skill"}
          </p>

          <div className="flex flex-wrap gap-2 mb-3">
            {suggestionList
              .filter((s) => !(data.skills ?? []).includes(s))
              .slice(0, 8)
              .map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={(data.skills?.length ?? 0) >= 10}
                  onClick={() => onAddSkill(s)}
                  className="cursor-pointer text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:border-green-500 hover:text-green-700 hover:bg-green-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  + {s}
                </button>
              ))}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="skill-input"
                type="text"
                placeholder={accountType === "company" ? t("onboarding.servicePlaceholder") : t("onboarding.skillPlaceholder")}
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                className="h-12"
                disabled={(data.skills?.length ?? 0) >= 10}
              />
              {newSkill.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border rounded-md shadow-lg z-20 max-h-38 overflow-y-auto">
                  {suggestionList
                    .filter((s) => s.toLowerCase().includes(newSkill.toLowerCase()))
                    .slice(0, 6)
                    .map((s) => (
                      <div
                        key={s}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                        onMouseDown={() => {
                          if (!(data.skills ?? []).includes(s)) onAddSkill(s);
                          setNewSkill("");
                        }}
                      >
                        {s}
                      </div>
                    ))}
                </div>
              )}
            </div>
            <Button
              onClick={handleAdd}
              className="h-12 px-4 bg-green-600 text-white hover:bg-green-700"
              disabled={!newSkill.trim() || (data.skills?.length ?? 0) >= 10}
            >
              {accountType === "company" ? t("onboarding.addService") : t("onboarding.addSkill")}
            </Button>
          </div>

          {(data.skills?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {(data.skills ?? []).map((skill) => (
                <Badge key={skill} variant="secondary" className="bg-green-100 text-green-700 pl-3 pr-2 py-1.5 text-sm">
                  {skill}
                  <button onClick={() => onRemoveSkill(skill)} className="cursor-pointer ml-2 hover:text-red-600">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Languages */}
        <div>
          <Label className="text-base font-medium text-gray-900 mb-3 block">
            {t("onboarding.yourLanguages")}
          </Label>
          <div className="space-y-3">
            {(data.languages ?? []).map((lang: Language) => (
              <div key={lang.id} className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-start sm:items-center">
                <div className="flex gap-2 w-full sm:flex-1">
                  <Select value={lang.language} onValueChange={(v) => onUpdateLanguage(lang.id, "language", v)}>
                    <SelectTrigger className="h-12 flex-1">
                      <SelectValue placeholder={t("onboarding.language")} />
                    </SelectTrigger>
                    <SelectContent position="popper" side="bottom" sideOffset={0} avoidCollisions={false} className="max-h-60">
                      {languageOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  {accountType === "person" && (
                    <Select value={lang.proficiency} onValueChange={(v) => onUpdateLanguage(lang.id, "proficiency", v)}>
                      <SelectTrigger className="h-12 flex-1">
                        <SelectValue placeholder={t("onboarding.proficiency")} />
                      </SelectTrigger>
                      <SelectContent>
                        {proficiencyOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveLanguage(lang.id)}
                  className="text-gray-400 hover:text-red-500"
                  disabled={(data.languages?.length ?? 0) === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button variant="outline" onClick={onAddLanguage} className="mt-4 gap-2">
            <Plus className="h-4 w-4" /> {t("onboarding.addLanguage")}
          </Button>
        </div>
      </div>
    </Card>
  );
}
