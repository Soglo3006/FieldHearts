"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import i18n from "@/lib/i18n";
import { getLanguageCode } from "@/lib/locale";
import { needsOnboardingSetup } from "@/lib/onboarding";
import { PersonalIllustration, BusinessIllustration } from "@/components/onboarding/AccountTypeIllustrations";
import { clearOnboardingStorage } from "@/lib/onboardingStorage";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/Spinner";
import { ChooseTypeSkeleton } from "@/components/auth/AuthPageSkeleton";

function LanguageToggle() {
  const { i18n: i18nInstance } = useTranslation();
  const activeLng = getLanguageCode(i18nInstance.language);

  const handleChange = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("i18nextLng", lng);
  };

  return (
    <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={() => handleChange("fr")}
        className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
          activeLng === "fr" ? "bg-green-700 text-white" : "text-gray-500 hover:text-gray-800"
        }`}
      >
        FR
      </button>
      <button
        type="button"
        onClick={() => handleChange("en")}
        className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
          activeLng === "en" ? "bg-green-700 text-white" : "text-gray-500 hover:text-gray-800"
        }`}
      >
        EN
      </button>
    </div>
  );
}

type AccountType = "person" | "company";
type Phase = "choose" | "intro";

function ChooseTypeContent() {
  const { t } = useTranslation();
  const { user, session, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isChangingType = searchParams.get("change") === "true";
  const [phase, setPhase] = useState<Phase>("choose");
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [selectedType, setSelectedType] = useState<AccountType | null>(null);
  const [submittingAction, setSubmittingAction] = useState<"skip" | "continue" | null>(null);
  const submitting = submittingAction !== null;

  const introCompleted = Boolean(user && !needsOnboardingSetup(user));

  useEffect(() => {
    if (loading || submitting || !introCompleted || isChangingType) return;
    router.replace("/");
  }, [introCompleted, loading, submitting, isChangingType, router]);

  const initializeAccount = async (accountType: AccountType, skipProfileForm: boolean) => {
    const token = session?.access_token;
    if (!token) {
      toast.error(t("onboarding.authError"));
      router.push("/login");
      return false;
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profiles/initialize`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        account_type: accountType,
        skip_profile_form: skipProfileForm,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to initialize account");
    }

    const { error } = await supabase.auth.refreshSession();
    if (error) throw error;

    return true;
  };

  const handleSelectType = (type: AccountType) => {
    setSelectedType(type);
    setDirection("forward");
    setPhase("intro");
  };

  const handleBackToChoose = () => {
    setDirection("backward");
    setPhase("choose");
  };

  const handleSkip = async () => {
    if (!selectedType) return;
    setSubmittingAction("skip");
    try {
      if (isChangingType) clearOnboardingStorage(user?.id);
      await initializeAccount(selectedType, true);
      router.replace("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("onboarding.profileSaveFailed", { message: "" }));
      setSubmittingAction(null);
    }
  };

  const handleContinue = async () => {
    if (!selectedType) return;
    setSubmittingAction("continue");
    try {
      if (isChangingType) clearOnboardingStorage(user?.id);
      await initializeAccount(selectedType, false);
      router.replace(`/profile/complete_profil?type=${selectedType}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("onboarding.profileSaveFailed", { message: "" }));
      setSubmittingAction(null);
    }
  };

  if (loading && !submitting) return <ChooseTypeSkeleton />;
  if (introCompleted && !submitting && !isChangingType) return null;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 pt-3">
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("onboarding.back")}
        </Link>
        <LanguageToggle />
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-8">

      {phase === "choose" && (
        <Card
          className={`flex min-h-[360px] w-full max-w-2xl flex-col justify-center border-0 p-5 sm:p-6 animate-in fade-in duration-300 ${
            direction === "backward" ? "slide-in-from-left-4" : ""
          }`}
        >
          <h2 className="text-xl font-bold text-gray-900 mb-1 text-center">
            {t("onboarding.accountTypeTitle")}
          </h2>
          <p className="text-sm text-gray-400 text-center mb-6">
            {t("onboarding.accountTypeSubtitle")}
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleSelectType("person")}
              className="group relative h-full cursor-pointer rounded-2xl border-2 border-gray-200 bg-white p-6 text-center transition-all hover:border-green-600 hover:shadow-md"
            >
              <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 bg-white text-transparent transition-colors group-hover:border-green-600 group-hover:bg-green-600 group-hover:text-white">
                <Check className="h-3.5 w-3.5" />
              </span>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-700 transition-colors group-hover:bg-green-100">
                <PersonalIllustration className="h-9 w-9" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{t("onboarding.individual")}</h3>
              <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{t("onboarding.individualDesc")}</p>
            </button>

            <button
              type="button"
              onClick={() => handleSelectType("company")}
              className="group relative h-full cursor-pointer rounded-2xl border-2 border-gray-200 bg-white p-6 text-center transition-all hover:border-green-600 hover:shadow-md"
            >
              <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 bg-white text-transparent transition-colors group-hover:border-green-600 group-hover:bg-green-600 group-hover:text-white">
                <Check className="h-3.5 w-3.5" />
              </span>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-700 transition-colors group-hover:bg-green-100">
                <BusinessIllustration className="h-9 w-9" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{t("onboarding.company")}</h3>
              <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{t("onboarding.companyDesc")}</p>
            </button>
          </div>
        </Card>
      )}

      {phase === "intro" && selectedType && (
        <Card
          className={`relative flex min-h-[360px] w-full max-w-2xl flex-col justify-center border-0 p-5 sm:p-6 animate-in fade-in duration-300 ${
            direction === "forward" ? "slide-in-from-right-4" : ""
          }`}
        >
          <button
            type="button"
            onClick={handleBackToChoose}
            className="absolute left-6 top-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 cursor-pointer sm:left-8 sm:top-8"
            disabled={submitting}
          >
            ← {t("onboarding.changeAccountType")}
          </button>

          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">
            {t("onboarding.basicInfoIntroTitle")}
          </h2>
          <p className="text-sm text-gray-400 text-center mb-5">
            {t("onboarding.basicInfoIntroDesc")}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11 cursor-pointer"
              onClick={handleSkip}
              disabled={submitting}
            >
              {t("onboarding.skipForNow")}
            </Button>
            <Button
              type="button"
              className="flex-1 h-11 bg-green-600 hover:bg-green-700 text-white cursor-pointer"
              onClick={handleContinue}
              disabled={submitting}
            >
              {submittingAction === "continue" ? <Spinner size="sm" /> : t("onboarding.letsGo")}
            </Button>
          </div>
        </Card>
      )}
      </div>
    </div>
  );
}

export default function ChooseTypePage() {
  return (
    <Suspense>
      <ChooseTypeContent />
    </Suspense>
  );
}
