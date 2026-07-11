"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Building2, Loader2 } from "lucide-react";
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
  onEditPayment?: () => void;
}

function formatBankAccountParts(bank: NonNullable<ConnectStatus["bank_account"]>) {
  const routing = bank.routing_number || null;
  const last4 = bank.last4 ? `••••${bank.last4}` : null;
  return { routing, last4 };
}

export default function StepSummary({
  data,
  accountType,
  accessToken,
  payoutStatus: payoutStatusProp = null,
  onEditPayment,
}: Props) {
  const { t } = useTranslation();
  const [payoutStatus, setPayoutStatus] = useState<ConnectStatus | null>(payoutStatusProp);
  const [statusLoading, setStatusLoading] = useState(!payoutStatusProp);

  useEffect(() => {
    if (payoutStatusProp) {
      setPayoutStatus((prev) => (prev ? { ...prev, ...payoutStatusProp } : payoutStatusProp));
      setStatusLoading(false);
    }
  }, [payoutStatusProp]);

  useEffect(() => {
    if (!accessToken) {
      setStatusLoading(false);
      return;
    }

    let cancelled = false;
    if (!payoutStatusProp) setStatusLoading(true);
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

  const bank = payoutStatus?.bank_account;
  const showBankCard = Boolean(payoutStatus?.charges_enabled && bank?.last4);
  const bankParts = bank ? formatBankAccountParts(bank) : null;

  const payoutLabel = payoutStatus?.charges_enabled
    ? t("onboarding.payoutConfigured")
    : payoutStatus?.details_submitted
      ? t("onboarding.payoutVerifying")
      : t("onboarding.payoutLater");

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
          {statusLoading && !payoutStatus ? (
            <div className="mt-1">
              <p className="text-gray-700 mb-1.5">
                <strong>{t("onboarding.payoutSectionTitle")}:</strong>
              </p>
              <p className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                {t("onboarding.payoutStatusLoading")}
              </p>
            </div>
          ) : showBankCard && bank && bankParts ? (
            <div className="mt-1">
              <p className="text-gray-700 mb-1.5">
                <strong>{t("onboarding.payoutSectionTitle")}:</strong>
              </p>
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                  <Building2 className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold uppercase tracking-wide text-gray-900">
                      {bank.bank_name || t("onboarding.bankAccount")}
                    </p>
                    {bank.currency && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium uppercase text-gray-500">
                        {bank.currency}
                      </span>
                    )}
                  </div>
                  {(bankParts.routing || bankParts.last4) && (
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
                      {bankParts.routing && <span>{bankParts.routing}</span>}
                      {bankParts.routing && bankParts.last4 && (
                        <span className="inline-flex items-center gap-0.5 text-gray-300" aria-hidden>
                          <span className="h-1 w-1 rounded-full bg-current" />
                          <span className="h-1 w-1 rounded-full bg-current" />
                        </span>
                      )}
                      {bankParts.last4 && <span>{bankParts.last4}</span>}
                    </p>
                  )}
                </div>
                {onEditPayment && (
                  <button
                    type="button"
                    onClick={onEditPayment}
                    className="shrink-0 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    {t("payoutSetup.manageBank")}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-700">
              <strong>{t("onboarding.payoutSectionTitle")}:</strong> {payoutLabel}
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

        <p className="text-sm text-gray-500 italic">{t("onboarding.confirmReady")}</p>
      </div>
    </Card>
  );
}
