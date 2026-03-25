"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useState, useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { OnboardingData, Experience, PortfolioItem } from "@/components/onboarding/onboardingTypes";
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

function LanguageToggle() {
  const { i18n: i18nInstance } = useTranslation();
  const activeLng = i18nInstance.language?.startsWith("fr") ? "fr" : "en";

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

  const [currentStep, setCurrentStep] = useState(stepFromUrl ?? 1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const totalSteps = accountType === "company" ? 5 : 7;

  const storageKey = `onboarding_data_${accountType}`;

  const [data, setData] = useState<OnboardingData>({
    accountType: "" as "" | "person" | "company",
    avatar: "",
    email: "",
    phone: "",
    adresse: "",
    ville: "",
    province: "",
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

  // Load from sessionStorage after hydration (per-tab — avoids conflicts with multiple tabs)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) setData(JSON.parse(saved));
    } catch {}
  }, [storageKey]);

  // Persist data to sessionStorage on every change
  useEffect(() => {
    try { sessionStorage.setItem(storageKey, JSON.stringify(data)); } catch {}
  }, [data, storageKey]);

  useEffect(() => {
    if (user) setData((p) => ({ ...p, email: user.email || "", fullName: p.fullName || user.user_metadata?.full_name || "" }));
  }, [user]);

  useEffect(() => { setData((p) => ({ ...p, accountType: accountType as "person" | "company" })); }, [accountType]);

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

  // Validation
  const isStep1Valid = accountType === "person"
    ? !!data.fullName?.trim() && !!data.phone.trim() && !!data.adresse.trim() && !!data.ville.trim() && !!data.province.trim()
    : !!data.companyName?.trim() && !!data.phone.trim() && !!data.adresse.trim() && !!data.ville.trim() && !!data.province.trim();
  const isStep2Valid = accountType === "person"
    ? !!data.profession?.trim()
    : !!data.industry?.trim();
  const isStep3Valid = (data.skills?.length ?? 0) > 0;

  const isBankStep = (accountType === "person" && currentStep === 6) || (accountType === "company" && currentStep === 4);

  const canProceed = () => {
    if (currentStep === 1) return isStep1Valid;
    if (currentStep === 2) return isStep2Valid;
    if (currentStep === 3) return isStep3Valid;
    if (isBankStep) return true; // optional step
    return true;
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
    router.replace(`/profile/complete_profil?type=${accountType}&step=${step}`);
  };

  const handleNext = async () => {
    if (currentStep < totalSteps) {
      goToStep(currentStep + 1);
      return;
    }
    setLoading(true);
    try {
      const token = session?.access_token;
      if (!token) { toast.error(t("onboarding.authError")); router.push("/login"); return; }

      const payload = {
        account_type: data.accountType,
        phone: data.phone,
        address: data.adresse,
        city: data.ville,
        province: data.province,
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

      try { sessionStorage.removeItem(storageKey); } catch {}
      setShowSuccess(true);
      setTimeout(() => router.push("/"), 2000);
    } catch (err: unknown) {
      toast.error(t("onboarding.profileSaveFailed", { message: err instanceof Error ? err.message : String(err) }));
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) return <SuccessScreen />;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex justify-end px-4 pt-3">
        <LanguageToggle />
      </div>

      <OnboardingStepBar accountType={accountType} currentStep={currentStep} totalSteps={totalSteps} />

      <main className="flex-1 py-4 sm:py-8 px-3 sm:px-4">
        <div className="max-w-2xl mx-auto">
          {currentStep === 1 && (
            <StepBasicInfo data={data} accountType={accountType} onChange={patch} />
          )}
          {currentStep === 2 && (
            <StepAbout data={data} accountType={accountType} onChange={patch} />
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
              onAdd={handleAddPortfolioItem}
              onRemove={handleRemovePortfolio}
              onUpdate={handleUpdatePortfolio}
            />
          )}
          {/* Bank account step: person = step 6, company = step 4 */}
          {((accountType === "person" && currentStep === 6) || (accountType === "company" && currentStep === 4)) && (
            <StepBankAccount accessToken={session?.access_token ?? ""} accountType={accountType} />
          )}
          {currentStep === totalSteps && (
            <StepSummary data={data} accountType={accountType} />
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
