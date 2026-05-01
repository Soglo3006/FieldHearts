"use client";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export default function SuccessScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();

  const profilePath = user ? `/profile/${user.id}` : "/";

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="h-10 w-10 text-green-700" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("onboarding.profileReady")}</h1>
        <p className="text-gray-600 mb-8">
          {t("onboarding.profileReadyDesc")}
        </p>
        <div className="flex flex-col gap-3">
          <Button
            className="w-full bg-green-700 hover:bg-green-800 text-white h-12"
            onClick={() => router.push("/")}
          >
            {t("onboarding.startExploring")}
          </Button>
          <Button
            variant="outline"
            className="w-full h-12"
            onClick={() => router.push(profilePath)}
          >
            {t("serviceDetail.viewProfile")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
