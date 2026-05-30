"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { UserPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfileCompletionGate } from "@/hooks/useProfileCompletionGate";
import { Spinner } from "@/components/ui/Spinner";

export default function ProfileCompletionRequiredScreen() {
  const { t } = useTranslation();
  const { loading, completeProfileHref } = useProfileCompletionGate();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-white">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div className="min-h-[50vh] bg-white flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-md p-8 max-w-md w-full text-center border border-gray-100">
        <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
          <UserPen className="h-8 w-8 text-green-700" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {t("profile.completeProfileRequired")}
        </h2>
        <p className="text-gray-600 text-sm mb-6">{t("profile.completeProfileRequiredDesc")}</p>
        <Button asChild className="w-full bg-green-700 hover:bg-green-800 text-white">
          <Link href={completeProfileHref}>{t("header.completeProfile")}</Link>
        </Button>
      </div>
    </div>
  );
}
