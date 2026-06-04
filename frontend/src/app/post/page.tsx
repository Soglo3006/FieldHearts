"use client";

import { useState, useEffect, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabaseClient";
import { POST_LOGIN_REDIRECT } from "@/lib/postRoutes";
import OfferServiceForm from "@/components/post/OfferServiceForm";
import LookingForWorkerForm from "@/components/post/LookingForWorkerForm";
import SuccessPopup from "@/components/post/SuccessPopup";
import { needsOnboardingSetup } from "@/lib/onboarding";
import { isProfileDetailsIncomplete } from "@/lib/onboardingSteps";
import ProfileCompletionRequiredScreen from "@/components/profile/ProfileCompletionRequiredScreen";
import { useMyProfile } from "@/hooks/useMyProfile";
import { MapPin } from "lucide-react";

const CANADIAN_PROVINCES = [
  "AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT",
  "Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador",
  "Nova Scotia", "Northwest Territories", "Nunavut", "Ontario", "Prince Edward Island",
  "Quebec", "Québec", "Saskatchewan", "Yukon",
];

type PostMode = "offer" | "looking";

type AccessGate = "checking" | "denied" | "allowed";

export default function PostServicePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { profile, loading: profileLoading } = useMyProfile();
  const [access, setAccess] = useState<AccessGate>("checking");
  const [mode, setMode] = useState<PostMode>("offer");
  const [success, setSuccess] = useState<{ type: PostMode; id: string } | null>(null);

  // Derive location-allowed from the profile already fetched by useMyProfile (no extra API call)
  const locationAllowed: boolean | null = profileLoading
    ? null
    : (() => {
        const province = (profile?.province || "").trim();
        if (!province) return false;
        return CANADIAN_PROVINCES.some((p) => p.toLowerCase() === province.toLowerCase());
      })();

  useLayoutEffect(() => {
    let alive = true;
    void supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!alive) return;
      if (!s?.user) {
        router.replace(POST_LOGIN_REDIRECT);
        setAccess("denied");
        return;
      }
      if (needsOnboardingSetup(s.user)) {
        router.replace("/choose_type");
        setAccess("denied");
        return;
      }
      setAccess("allowed");
    });
    return () => {
      alive = false;
    };
  }, [router]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.replace(POST_LOGIN_REDIRECT);
        setAccess("denied");
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);


  if (access === "checking") {
    return <div className="min-h-screen bg-white" aria-busy="true" />;
  }
  if (access === "denied") {
    return null;
  }

  if (!profileLoading && isProfileDetailsIncomplete(profile)) {
    return <ProfileCompletionRequiredScreen />;
  }

  if (!profileLoading && locationAllowed === false) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-md p-8 max-w-md w-full text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
            <MapPin className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t("post.canadaOnly")}</h2>
          <p className="text-gray-600 text-sm">{t("post.canadaOnlyDesc")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {success && (
        <SuccessPopup type={success.type} id={success.id} onClose={() => setSuccess(null)} />
      )}

      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">{t("post.createNewPost")}</h1>
            <p className="mt-3 text-gray-600 text-lg">{t("post.choosePostType")}</p>
          </div>

          <div className="flex gap-4 mb-6">
            {(["offer", "looking"] as PostMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`cursor-pointer flex-1 flex items-center justify-center gap-3 py-4 px-6 rounded-xl border-2 transition-all duration-200 font-semibold text-lg ${
                  mode === m
                    ? "bg-green-700 text-white border-green-700 shadow-lg"
                    : "bg-white text-gray-700 border-gray-200 hover:border-green-700 hover:bg-green-50"
                }`}
              >
                {m === "offer" ? t("post.offerService") : t("post.lookingForWorker")}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 sm:p-8">
            {mode === "offer" ? (
              <OfferServiceForm onSuccess={(id) => setSuccess({ type: "offer", id })} />
            ) : (
              <LookingForWorkerForm onSuccess={(id) => setSuccess({ type: "looking", id })} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
