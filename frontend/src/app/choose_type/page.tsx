"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPen, Building2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import i18n from "@/lib/i18n";
import { getLanguageCode } from "@/lib/locale";
import { needsOnboardingSetup } from "@/lib/onboarding";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/Spinner";

function LanguageToggle() {
  const { i18n: i18nInstance } = useTranslation();
  const activeLng = getLanguageCode(i18nInstance.language);

  const handleChange = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("i18nextLng", lng);
  };

  return (
    <div className="flex items-center gap-1 text-sm font-medium">
      <button
        type="button"
        onClick={() => handleChange("fr")}
        className={`px-2 py-1 rounded transition-colors cursor-pointer ${
          activeLng === "fr" ? "font-bold underline text-green-700" : "text-gray-500 hover:text-gray-800"
        }`}
      >
        FR
      </button>
      <span className="text-gray-300">|</span>
      <button
        type="button"
        onClick={() => handleChange("en")}
        className={`px-2 py-1 rounded transition-colors cursor-pointer ${
          activeLng === "en" ? "font-bold underline text-green-700" : "text-gray-500 hover:text-gray-800"
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
    setPhase("intro");
  };

  const clearOnboardingStorage = () => {
    try {
      ["person", "company"].forEach((type) => {
        localStorage.removeItem(`onboarding_data_${type}`);
        localStorage.removeItem(`onboarding_max_step_${type}`);
      });
    } catch {}
  };

  const handleSkip = async () => {
    if (!selectedType) return;
    setSubmittingAction("skip");
    try {
      if (isChangingType) clearOnboardingStorage();
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
      if (isChangingType) clearOnboardingStorage();
      await initializeAccount(selectedType, false);
      router.replace(`/profile/complete_profil?type=${selectedType}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("onboarding.profileSaveFailed", { message: "" }));
      setSubmittingAction(null);
    }
  };

  if (loading) return null;
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
        <Card className="p-6 sm:p-8 max-w-lg w-full animate-in fade-in duration-300">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">
            {t("onboarding.accountTypeTitle")}
          </h2>
          <p className="text-sm text-gray-400 text-center mb-6">
            {t("onboarding.accountTypeSubtitle")}
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleSelectType("person")}
              className="h-full cursor-pointer border rounded-xl p-6 flex flex-col items-center gap-3 transition-all hover:border-green-600 hover:bg-green-50 text-left"
            >
              <UserPen className="h-10 w-10 text-green-700" />
              <h3 className="text-lg font-semibold text-gray-900">{t("onboarding.individual")}</h3>
            </button>

            <button
              type="button"
              onClick={() => handleSelectType("company")}
              className="h-full cursor-pointer border rounded-xl p-6 flex flex-col items-center gap-3 transition-all hover:border-green-600 hover:bg-green-50 text-left"
            >
              <Building2 className="h-10 w-10 text-green-700" />
              <h3 className="text-lg font-semibold text-gray-900">{t("onboarding.company")}</h3>
            </button>
          </div>
        </Card>
      )}

      {phase === "intro" && selectedType && (
        <Card className="p-6 sm:p-8 max-w-lg w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
          <button
            type="button"
            onClick={() => setPhase("choose")}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-3 cursor-pointer"
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
