"use client";
import { useTranslation } from "react-i18next";
import { Check, User, Users, Building2, UserPen, FileText, Languages, Briefcase, FileUser, CreditCard } from "lucide-react";

const personIcons  = [User, UserPen, FileText, Languages, Briefcase, CreditCard, FileUser];
const companyIcons = [Users, Building2, FileText, CreditCard, FileUser];

interface Props {
  accountType: string;
  currentStep: number;
  totalSteps: number;
}

export default function OnboardingStepBar({ accountType, currentStep, totalSteps }: Props) {
  const { t } = useTranslation();

  const personTitles = [
    t("onboarding.step1"),
    t("onboarding.step2"),
    t("onboarding.step3"),
    t("onboarding.step4"),
    t("onboarding.step5"),
    t("onboarding.step6"),
    t("onboarding.step7"),
  ];
  const companyTitles = [
    t("onboarding.step1"),
    t("onboarding.step2"),
    t("onboarding.step3"),
    t("onboarding.step6"),
    t("onboarding.step7"),
  ];

  const titles = accountType === "company" ? companyTitles : personTitles;
  const icons = accountType === "company" ? companyIcons : personIcons;

  return (
    <div className="bg-white border-b border-gray-200 top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 py-4 sm:py-6">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1">{t("onboarding.basicInfoTitle")}</h1>
        <p className="text-gray-600 text-sm">{t("onboarding.step1")} {currentStep} / {totalSteps}</p>
        <div className="flex justify-between mt-4">
          {titles.map((title, index) => {
            const StepIcon = icons[index];
            const stepNum = index + 1;
            const isCompleted = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;
            return (
              <div key={index} className="flex flex-col items-center">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all ${
                  isCompleted ? "bg-green-700 text-white"
                    : isCurrent ? "bg-green-700 text-white ring-4 ring-green-100"
                    : "bg-gray-200 text-gray-500"
                }`}>
                  {isCompleted
                    ? <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                    : StepIcon && <StepIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />}
                </div>
                <span className={`text-xs mt-2 hidden sm:block ${isCurrent ? "text-green-700 font-medium" : "text-gray-500"}`}>
                  {title}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
