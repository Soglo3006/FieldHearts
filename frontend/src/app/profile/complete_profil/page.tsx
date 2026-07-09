"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useState, useEffect, useCallback, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { ChevronRight, ChevronLeft, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { OnboardingData, Experience, PortfolioItem, BIO_MAX } from "@/components/onboarding/onboardingTypes";
import OnboardingStepBar from "@/components/onboarding/OnboardingStepBar";
import SuccessScreen from "@/components/onboarding/SuccessScreen";
import StepBasicInfo from "@/components/onboarding/StepBasicInfo";
import StepAbout from "@/components/onboarding/StepAbout";
import StepSkillsServices from "@/components/onboarding/StepSkillsServices";
import StepExperience from "@/components/onboarding/StepExperience";
import StepPortfolio from "@/components/onboarding/StepPortfolio";
import StepSummary from "@/components/onboarding/StepSummary";
import StepBankAccount from "@/components/onboarding/StepBankAccount";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/Spinner";

function FinalizingScreen() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6 px-4">
      <div className="relative flex items-center justify-center">
        <div className="w-20 h-20 rounded-full border-4 border-green-100 border-t-green-700 animate-spin" />
        <div className="absolute w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-green-600" />
        </div>
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">{t("onboarding.finalizingTitle")}</h2>
        <p className="text-gray-500 mt-2 text-sm">{t("onboarding.finalizingDesc")}</p>
      </div>
    </div>
  );
}
import { needsOnboardingSetup } from "@/lib/onboarding";
import { getLanguageCode } from "@/lib/locale";
import { getOnboardingStepCompletions, onboardingDataFromProfile, onboardingDataToPayoutProfile, resolveOnboardingMaxStep } from "@/lib/onboardingSteps";
import type { AccountType, ProfileRecord } from "@/lib/onboardingSteps";
import { saveOnboardingBasicInfo } from "@/lib/saveOnboardingBasicInfo";

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
          activeLng === "fr"
            ? "font-bold underline text-green-700"
            : "text-gray-500 hover:text-gray-800"
        }`}
      >
        FR
      </button>
      <span className="text-gray-300">|</span>
      <button
        type="button"
        onClick={() => handleChange("en")}
        className={`px-2 py-1 rounded transition-colors cursor-pointer ${
          activeLng === "en"
            ? "font-bold underline text-green-700"
            : "text-gray-500 hover:text-gray-800"
        }`}
      >
        EN
      </button>
    </div>
  );
}

function OnboardingContent() {
  const { user, session } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const accountType = searchParams.get("type") || "person";

  const stepFromUrl = searchParams.get("step") ? Number(searchParams.get("step")) : null;

  useEffect(() => {
    if (!session && !user) return;
    if (needsOnboardingSetup(user)) {
      router.replace("/choose_type");
    }
  }, [user, session, router]);

  const [currentStep, setCurrentStep] = useState(stepFromUrl ?? 1);
  const [maxStepReached, setMaxStepReached] = useState(stepFromUrl ?? 1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bioError, setBioError] = useState("");

  const totalSteps = accountType === "company" ? 6 : 7;
  const paymentStep = accountType === "company" ? 5 : 6;

  const storageKey = `onboarding_data_${accountType}`;
  const maxStepKey = `onboarding_max_step_${accountType}`;

  const [data, setData] = useState<OnboardingData>({
    accountType: "" as "" | "person" | "company",
    avatar: "",
    email: "",
    phone: "",
    adresse: "",
    ville: "",
    province: "",
    postalCode: "",
    fullName: "",
    profession: "",
    bio: "",
    skills: [],
    languages: [],
    experiences: [],
    companyName: "",
    industry: "",
    companyBio: "",
    teamSize: "",
    portfolio: [],
  });

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setData(JSON.parse(saved));
    } catch {}
  }, [storageKey]);

  // Persist data to localStorage on every change
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch {}
  }, [data, storageKey]);

  // Restore maxStepReached from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(maxStepKey);
      if (saved) setMaxStepReached((prev) => Math.max(prev, Number(saved)));
    } catch {}
  }, [maxStepKey]);

  useEffect(() => {
    if (user) {
      const meta = user.user_metadata || {};
      const first = (meta.first_name as string) || "";
      const last = (meta.last_name as string) || "";
      const combined = [first, last].filter(Boolean).join(" ");
      setData((p) => ({
        ...p,
        email: user.email || "",
        fullName: p.fullName || combined || (meta.full_name as string) || "",
      }));
    }
  }, [user]);

  useEffect(() => {
    if (!session?.access_token) return;
    let alive = true;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/profiles/me`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((profile: ProfileRecord | null) => {
        if (!alive || !profile) return;
        const fromProfile = onboardingDataFromProfile(profile);
        const profileCompleted =
          profile.profile_completed === true ||
          user?.user_metadata?.profile_completed === true;

        let hasSavedDraft = false;
        try {
          hasSavedDraft = Boolean(localStorage.getItem(storageKey));
        } catch {}

        if (!hasSavedDraft) {
          setData((p) => ({
            ...fromProfile,
            accountType: (accountType as "person" | "company"),
            email: p.email || fromProfile.email || user?.email || "",
          }));
        } else {
          setData((p) => ({
            ...p,
            phone: p.phone || fromProfile.phone,
            adresse: p.adresse || fromProfile.adresse,
            ville: p.ville || fromProfile.ville,
            province: p.province || fromProfile.province,
            postalCode: p.postalCode || fromProfile.postalCode,
            fullName: p.fullName || fromProfile.fullName,
            profession: p.profession || fromProfile.profession,
            industry: p.industry || fromProfile.industry,
            skills: (p.skills?.length ?? 0) > 0 ? p.skills : fromProfile.skills,
            bio: p.bio || fromProfile.bio,
            companyBio: p.companyBio || fromProfile.companyBio,
            companyName: p.companyName || fromProfile.companyName,
            teamSize: p.teamSize || fromProfile.teamSize,
            avatar: p.avatar || fromProfile.avatar,
            languages: (p.languages?.length ?? 0) > 0 ? p.languages : fromProfile.languages,
            experiences: (p.experiences?.length ?? 0) > 0 ? p.experiences : fromProfile.experiences,
            portfolio: (p.portfolio?.length ?? 0) > 0 ? p.portfolio : fromProfile.portfolio,
          }));
        }

        let savedMaxStep: number | null = null;
        try {
          const raw = localStorage.getItem(maxStepKey);
          if (raw) savedMaxStep = Number(raw);
        } catch {}

        const restoredMax = resolveOnboardingMaxStep(totalSteps, {
          savedMaxStep,
          profileCompleted,
        });
        setMaxStepReached((prev) => Math.max(prev, restoredMax));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [session?.access_token, storageKey, maxStepKey, accountType, totalSteps, user]);

  useEffect(() => { setData((p) => ({ ...p, accountType: accountType as "person" | "company" })); }, [accountType]);

  const payoutProfileSnapshot = onboardingDataToPayoutProfile({
    ...data,
    accountType: (data.accountType || accountType) as "person" | "company",
  });

  const persistBasicInfoIfReady = useCallback(async () => {
    const token = session?.access_token;
    if (!token) return false;
    return saveOnboardingBasicInfo(
      { ...data, accountType: (data.accountType || accountType) as "person" | "company" },
      token,
      user?.id,
    );
  }, [data, session?.access_token, user?.id, accountType]);

  useEffect(() => {
    setMaxStepReached((prev) => Math.max(prev, currentStep));
  }, [currentStep]);

  useEffect(() => {
    try { localStorage.setItem(maxStepKey, String(maxStepReached)); } catch {}
  }, [maxStepReached, maxStepKey]);

  useEffect(() => {
    if (stepFromUrl) setMaxStepReached((prev) => Math.max(prev, stepFromUrl));
  }, [stepFromUrl]);

  useEffect(() => {
    if (currentStep === paymentStep) {
      void persistBasicInfoIfReady();
    }
  }, [currentStep, paymentStep, persistBasicInfoIfReady]);

  const completedSteps = getOnboardingStepCompletions(
    accountType as AccountType,
    data,
    totalSteps,
    maxStepReached
  );

  // Enter key navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const target = e.target as HTMLElement;
      if (target.id === "skill-input" || target.tagName === "TEXTAREA") return;
      if (canProceed()) { e.preventDefault(); handleNext(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentStep, data]);

  const patch = (update: Partial<OnboardingData>) => setData((p) => ({ ...p, ...update }));

  // Skill handlers
  const handleAddSkill = (skill: string) => {
    if (!data.skills?.includes(skill)) patch({ skills: [...(data.skills ?? []), skill] });
  };
  const handleRemoveSkill = (skill: string) => patch({ skills: (data.skills ?? []).filter((s) => s !== skill) });

  // Language handlers
  const handleAddLanguage = () => {
    const newId = Math.max(0, ...(data.languages ?? []).map((l) => l.id)) + 1;
    patch({ languages: [...(data.languages ?? []), { id: newId, language: "", proficiency: "" }] });
  };
  const handleRemoveLanguage = (id: number) => patch({ languages: (data.languages ?? []).filter((l) => l.id !== id) });
  const handleUpdateLanguage = (id: number, field: "language" | "proficiency", value: string) =>
    patch({ languages: (data.languages ?? []).map((l) => l.id === id ? { ...l, [field]: value } : l) });

  // Experience handlers
  const handleAddExperience = () => {
    const newId = Math.max(0, ...(data.experiences ?? []).map((e) => e.id)) + 1;
    patch({ experiences: [...(data.experiences ?? []), { id: newId, title: "", company: "", period: "", description: "" }] });
  };
  const handleRemoveExperience = (id: number) => patch({ experiences: (data.experiences ?? []).filter((e) => e.id !== id) });
  const handleUpdateExperience = (id: number, field: keyof Experience, value: string) =>
    patch({ experiences: (data.experiences ?? []).map((e) => e.id === id ? { ...e, [field]: value } : e) });

  // Portfolio handlers
  const handleAddPortfolioItem = (item: PortfolioItem) => patch({ portfolio: [...(data.portfolio ?? []), item] });
  const handleRemovePortfolio = (id: number) => patch({ portfolio: (data.portfolio ?? []).filter((p) => p.id !== id) });
  const handleUpdatePortfolio = (id: number, field: keyof PortfolioItem, value: string) =>
    patch({ portfolio: (data.portfolio ?? []).map((p) => p.id === id ? { ...p, [field]: value } : p) });

  const canProceed = () => true;

  const goToStep = async (step: number) => {
    if (step === paymentStep) {
      await persistBasicInfoIfReady();
    }
    setCurrentStep(step);
    router.replace(`/profile/complete_profil?type=${accountType}&step=${step}`);
  };

  const handleNext = async () => {
    if (currentStep < totalSteps) {
      if (currentStep === 2) {
        const bioValue = accountType === "company" ? (data.companyBio || "") : (data.bio || "");
        if (bioValue.length > BIO_MAX) {
          setBioError(t("onboarding.bioTooLong"));
          return;
        }
      }
      setBioError("");
      if (currentStep === 1) {
        await persistBasicInfoIfReady();
      }
      await goToStep(currentStep + 1);
      return;
    }
    setLoading(true);
    try {
      const token = session?.access_token;
      if (!token) { toast.error(t("onboarding.authError")); router.push("/login"); return; }

      const payload = {
        account_type: data.accountType,
        full_name: data.fullName || "",
        phone: data.phone,
        address: data.adresse,
        city: data.ville,
        province: data.province,
        postal_code: data.postalCode || "",
        bio: data.bio || data.companyBio || "",
        avatar: data.avatar,
        profession: data.profession || "",
        skills: data.skills || [],
        languages: data.languages || [],
        experiences: data.experiences || [],
        company_name: data.companyName || "",
        industry: data.industry || "",
        team_size: data.teamSize || "",
        portfolio: data.portfolio || [],
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profiles/complete`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed to save profile"); }

      const { error } = await supabase.auth.updateUser({ data: { profile_completed: true } });
      if (error) throw error;

      try {
        const finalized = {
          ...data,
          accountType: (data.accountType || accountType) as "person" | "company",
        };
        localStorage.setItem(storageKey, JSON.stringify(finalized));
        localStorage.setItem(maxStepKey, String(totalSteps));
      } catch {}
      setShowSuccess(true);
    } catch (err: unknown) {
      toast.error(t("onboarding.profileSaveFailed", { message: err instanceof Error ? err.message : String(err) }));
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) return <SuccessScreen />;
  if (loading) return <FinalizingScreen />;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex items-center justify-between px-4 pt-3">
        <Link
          href="/choose_type?change=true"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("onboarding.back")}
        </Link>
        <LanguageToggle />
      </div>

      <OnboardingStepBar
        accountType={accountType}
        currentStep={currentStep}
        totalSteps={totalSteps}
        completedSteps={completedSteps}
        maxStepReached={maxStepReached}
        onStepClick={goToStep}
      />

      <main className="flex-1 py-4 sm:py-8 px-3 sm:px-4">
        <div className="max-w-2xl mx-auto">
          {currentStep === 1 && (
            <StepBasicInfo data={data} accountType={accountType} onChange={patch} />
          )}
          {currentStep === 2 && (
            <StepAbout
              data={data}
              accountType={accountType}
              onChange={(update) => { if ("bio" in update || "companyBio" in update) setBioError(""); patch(update); }}
              bioError={bioError}
            />
          )}
          {currentStep === 3 && (
            <StepSkillsServices
              data={data}
              accountType={accountType}
              onAddSkill={handleAddSkill}
              onRemoveSkill={handleRemoveSkill}
              onAddLanguage={handleAddLanguage}
              onRemoveLanguage={handleRemoveLanguage}
              onUpdateLanguage={handleUpdateLanguage}
            />
          )}
          {accountType === "person" && currentStep === 4 && (
            <StepExperience
              experiences={data.experiences ?? []}
              onAdd={handleAddExperience}
              onRemove={handleRemoveExperience}
              onUpdate={handleUpdateExperience}
            />
          )}
          {accountType === "person" && currentStep === 5 && (
            <StepPortfolio
              portfolio={data.portfolio ?? []}
              accountType="person"
              onAdd={handleAddPortfolioItem}
              onRemove={handleRemovePortfolio}
              onUpdate={handleUpdatePortfolio}
            />
          )}
          {accountType === "company" && currentStep === 4 && (
            <StepPortfolio
              portfolio={data.portfolio ?? []}
              accountType="company"
              onAdd={handleAddPortfolioItem}
              onRemove={handleRemovePortfolio}
              onUpdate={handleUpdatePortfolio}
            />
          )}
          {/* Bank account step: person = step 6, company = step 5 */}
          {((accountType === "person" && currentStep === 6) || (accountType === "company" && currentStep === 5)) && (
            <StepBankAccount
              accessToken={session?.access_token ?? ""}
              accountType={accountType}
              autoReconnect={searchParams.get("stripe") === "refresh"}
              onGoToProfileStep={(step) => goToStep(step)}
              profileSnapshot={payoutProfileSnapshot}
            />
          )}
          {currentStep === totalSteps && (
            <StepSummary
              data={data}
              accountType={accountType}
              accessToken={session?.access_token}
            />
          )}

          <div className="flex justify-between mt-6 sm:mt-8 gap-3">
            <Button
              variant="outline"
              onClick={() => goToStep(currentStep - 1)}
              disabled={currentStep === 1}
              className="gap-2 h-10 sm:h-12 px-4 sm:px-6 text-sm sm:text-base"
            >
              <ChevronLeft className="h-4 w-4" /> {t("onboarding.back")}
            </Button>
            <div className="flex gap-2">
              {currentStep < totalSteps && (
                <Button
                  variant="ghost"
                  onClick={() => router.push("/")}
                  className="h-10 sm:h-12 px-3 sm:px-4 text-sm sm:text-base text-gray-400 hover:text-gray-600"
                >
                  {t("onboarding.skipForNow")}
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={!canProceed() || loading}
                className="bg-green-600 hover:bg-green-700 text-white gap-2 h-10 sm:h-12 px-4 sm:px-6 text-sm sm:text-base"
              >
                {loading ? t("common.loading") : currentStep === totalSteps ? t("onboarding.finish") : t("onboarding.next")}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="md" />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
