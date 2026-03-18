"use client";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { OnboardingData } from "./onboardingTypes";

interface Props {
  data: OnboardingData;
  accountType: string;
}

export default function StepSummary({ data, accountType }: Props) {
  const { t } = useTranslation();

  return (
    <Card className="p-6 sm:p-8 animate-in fade-in duration-300">
      <h2 className="text-xl font-bold text-gray-900">{t("onboarding.profileSummary")}</h2>
      <p className="text-gray-600">{t("onboarding.summarySubtitle")}</p>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16 sm:w-24 sm:h-24">
            {data.avatar && <AvatarImage src={data.avatar} alt="avatar" className="object-cover" />}
            <AvatarFallback className="text-2xl bg-green-100 text-green-800 font-semibold">
              {(accountType === "person" ? data.fullName : data.companyName)?.charAt(0)?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-lg font-semibold">
              {accountType === "person" ? data.fullName : data.companyName}
            </h3>
            <p className="text-gray-600">{accountType === "person" ? data.profession : data.industry}</p>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-2">Contact</h4>
          <p className="text-gray-700"><strong>Email:</strong> {data.email}</p>
          <p className="text-gray-700"><strong>Phone:</strong> {data.phone}</p>
          <p className="text-gray-700"><strong>Address:</strong> {data.adresse}, {data.ville}, {data.province}</p>
        </div>

        {(accountType === "person" ? (data.bio?.trim().length ?? 0) > 0 : (data.companyBio?.trim().length ?? 0) > 0) && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">{accountType === "person" ? t("onboarding.bio") : t("onboarding.companyBio")}</h4>
            <p className="text-gray-700 whitespace-pre-line">{accountType === "person" ? data.bio : data.companyBio}</p>
          </div>
        )}

        {accountType === "company" && data.teamSize?.trim() && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">{t("onboarding.teamSize")}</h4>
            <p className="text-gray-700">{data.teamSize}</p>
          </div>
        )}

        {(data.skills?.length ?? 0) > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">{t("onboarding.skillsAndServices")}</h4>
            <div className="flex flex-wrap gap-2">
              {(data.skills ?? []).map((skill) => (
                <span key={skill} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">{skill}</span>
              ))}
            </div>
          </div>
        )}

        {(data.languages?.length ?? 0) > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">{t("onboarding.yourLanguages")}</h4>
            <div className="flex flex-wrap gap-2">
              {(data.languages ?? []).map((lang) => (
                <span key={lang.id} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                  {lang.language}{lang.proficiency ? ` – ${lang.proficiency}` : ""}
                </span>
              ))}
            </div>
          </div>
        )}

        {(data.experiences ?? []).some((e) => e.title.trim() || e.company.trim() || e.description.trim()) && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">{t("onboarding.workExperience")}</h4>
            <div className="space-y-4">
              {(data.experiences ?? [])
                .filter((e) => e.title.trim() || e.company.trim() || e.description.trim())
                .map((exp) => (
                  <div key={exp.id} className="border border-gray-200 rounded-lg p-4">
                    <h5 className="font-medium">{exp.title} @ {exp.company}</h5>
                    <p className="text-sm text-gray-500">{exp.period}</p>
                    <p className="text-gray-700 mt-2">{exp.description}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {(data.portfolio?.length ?? 0) > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">{t("onboarding.portfolio")}</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
              {(data.portfolio ?? []).map((item) => (
                <div key={item.id} className="border rounded-lg overflow-hidden">
                  <div className="relative aspect-square">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                  <p className="text-center p-2 text-sm font-medium">{item.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-sm text-gray-500 italic">{t("onboarding.confirmReady")}</p>
      </div>
    </Card>
  );
}
