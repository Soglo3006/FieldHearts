"use client";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Briefcase } from "lucide-react";
import { Experience } from "./onboardingTypes";

interface Props {
  experiences: Experience[];
  onAdd: () => void;
  onRemove: (id: number) => void;
  onUpdate: (id: number, field: keyof Experience, value: string) => void;
}

export default function StepExperience({ experiences, onAdd, onRemove, onUpdate }: Props) {
  const { t } = useTranslation();

  return (
    <Card className="p-6 sm:p-8 animate-in fade-in duration-300">
      <h2 className="text-xl font-bold text-gray-900">{t("onboarding.workExperience")}</h2>
      <p className="text-gray-600">{t("onboarding.experienceSubtitle")}</p>

      <div className="space-y-6">
        {experiences.map((exp) => (
          <div key={exp.id} className="p-4 border border-gray-200 rounded-xl relative">
            <button type="button" title={t('onboarding.removeExperience')} aria-label={t('onboarding.removeExperience')} onClick={() => onRemove(exp.id)} className="cursor-pointer absolute top-4 right-4 text-gray-400 hover:text-red-500">
              <Trash2 className="h-4 w-4" />
            </button>
            <div className="space-y-4 pr-8">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">{t("onboarding.jobTitle")}</Label>
                  <Input placeholder={t('onboarding.experienceTitlePlaceholder')} value={exp.title} onChange={(e) => onUpdate(exp.id, "title", e.target.value)} className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">{t("onboarding.company")}</Label>
                  <Input placeholder={t('onboarding.experienceCompanyPlaceholder')} value={exp.company} onChange={(e) => onUpdate(exp.id, "company", e.target.value)} className="h-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">{t("onboarding.period")}</Label>
                <Input placeholder={t('onboarding.experiencePeriodPlaceholder')} value={exp.period} onChange={(e) => onUpdate(exp.id, "period", e.target.value)} className="h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">{t("onboarding.description")}</Label>
                <Textarea placeholder={t('onboarding.experienceDescriptionPlaceholder')} value={exp.description} onChange={(e) => onUpdate(exp.id, "description", e.target.value)} className="min-h-20 resize-none" />
              </div>
            </div>
          </div>
        ))}

        {experiences.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
            <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">{t('onboarding.noExperience')}</p>
          </div>
        )}

        <Button variant="outline" onClick={onAdd} className="w-full gap-2">
          <Plus className="h-4 w-4" /> {t("onboarding.addExperience")}
        </Button>
      </div>
    </Card>
  );
}
