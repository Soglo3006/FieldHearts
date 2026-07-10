"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock, CreditCard, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import AppImage from "@/components/ui/AppImage";
import { OnboardingData } from "./onboardingTypes";
import type { ConnectStatus } from "@/components/stripe/StripePayoutSetup";

interface Props {
  data: OnboardingData;
  accountType: string;
  accessToken?: string;
  payoutStatus?: ConnectStatus | null;
}

export default function StepSummary({
  data,
  accountType,
  accessToken,
  payoutStatus: payoutStatusProp = null,
}: Props) {
  const { t } = useTranslation();
  const [payoutStatus, setPayoutStatus] = useState<ConnectStatus | null>(payoutStatusProp);
  const [statusLoading, setStatusLoading] = useState(!payoutStatusProp);

  useEffect(() => {
    if (payoutStatusProp) {
      setPayoutStatus(payoutStatusProp);
      setStatusLoading(false);
    }
  }, [payoutStatusProp]);

  useEffect(() => {
    if (!accessToken) {
      setStatusLoading(false);
      return;
    }
    if (payoutStatusProp) return;

    let cancelled = false;
    setStatusLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/connect/status`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((status: ConnectStatus | null) => {
        if (!cancelled && status) setPayoutStatus(status);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setStatusLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, payoutStatusProp]);

  const payoutLabel = payoutStatus?.charges_enabled
    ? t("onboarding.payoutConfigured")
    : payoutStatus?.details_submitted
      ? t("onboarding.payoutVerifying")
      : t("onboarding.payoutLater");

  const PayoutIcon = payoutStatus?.charges_enabled
    ? CheckCircle2
    : payoutStatus?.details_submitted
      ? Clock
      : CreditCard;

  const payoutIconClass = payoutStatus?.charges_enabled
    ? "text-green-600"
    : payoutStatus?.details_submitted
      ? "text-amber-500"
      : "text-gray-400";

  return (
    <Card className="p-6 sm:p-8 animate-in fade-in duration-300">
      <h2 className="text-xl font-bold text-gray-900">{t("onboarding.profileSummary")}</h2>
      <p className="text-gray-600">{t("onboarding.summarySubtitle")}</p>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16 sm:w-24 sm:h-24">
            {data.avatar && <AvatarImage src={data.avatar} alt={t("onboarding.avatarAlt")} className="object-cover" />}
            <AvatarFallback className="text-2xl bg-green-100 text-green-800 font-semibold">
              {(accountType === "person" ? data.fullName : data.companyName)?.charAt(0)?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-lg font-semibold">
              {accountType === "person" ? data.fullName : data.companyName}
            </h3>
            {(accountType === "person" ? data.profession?.trim() : data.industry?.trim()) && (
              <p className="text-gray-600">{accountType === "person" ? data.profession : data.industry}</p>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-2">{t("onboarding.contactSectionTitle")}</h4>
          {data.email?.trim() && (
            <p className="text-gray-700"><strong>{t("onboarding.emailLabel")}:</strong> {data.email}</p>
          )}
          {data.phone?.trim() && (
            <p className="text-gray-700"><strong>{t("onboarding.phoneLabel")}:</strong> {data.phone}</p>
          )}
          {(data.adresse?.trim() || data.ville?.trim() || data.province?.trim()) && (
            <p className="text-gray-700">
              <strong>{t("onboarding.addressLabel")}:</strong>{" "}
              {[data.adresse, data.ville, data.province].filter(Boolean).join(", ")}
            </p>
          )}
        </div>

        {(accountType === "person" ? (data.bio?.trim().length ?? 0) > 0 : (data.companyBio?.trim().length ?? 0) > 0) && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">{accountType === "person" ? t("onboarding.bio") : t("onboarding.companyBio")}</h4>
            <p className="text-gray-700 whitespace-pre-line wrap-break-word">{accountType === "person" ? data.bio : data.companyBio}</p>
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

        {(data.languages ?? []).filter((l) => l.language.trim()).length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">{t("onboarding.yourLanguages")}</h4>
            <div className="flex flex-wrap gap-2">
              {(data.languages ?? []).filter((l) => l.language.trim()).map((lang) => (
                <span key={lang.id} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                  {lang.language}{lang.proficiency ? ` – ${lang.proficiency}` : ""}
                </span>
              ))}
            </div>
          </div>
        )}

        {accountType === "person" && (data.experiences ?? []).some((e) => e.title.trim() || e.company.trim() || e.description.trim()) && (
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
            <h4 className="font-semibold text-gray-900 mb-2">{accountType === "company" ? t("onboarding.companyProjectsTitle") : t("onboarding.portfolio")}</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
              {(data.portfolio ?? []).map((item) => (
                <div key={item.id} className="border rounded-lg overflow-hidden">
                  <div className="relative aspect-4/3 bg-gray-100">
                    <AppImage src={item.image} alt={item.title} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover" />
                  </div>
                  <p className="text-center p-2 text-sm font-medium">{item.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h4 className="font-semibold text-gray-900 mb-2">{t("onboarding.payoutSectionTitle")}</h4>
          {statusLoading && !payoutStatus ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
              <p>{t("onboarding.payoutStatusLoading")}</p>
            </div>
          ) : (
            <div className="flex items-start gap-2 text-gray-700">
              <PayoutIcon className={`h-5 w-5 shrink-0 mt-0.5 ${payoutIconClass}`} />
              <p>{payoutLabel}</p>
            </div>
          )}
        </div>

        <p className="text-sm text-gray-500 italic">{t("onboarding.confirmReady")}</p>
        </div>
    </Card>
  );
}
