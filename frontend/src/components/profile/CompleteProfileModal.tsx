"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { profileCompletionPath } from "@/lib/onboardingSteps";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  open: boolean;
  onClose: () => void;
  accountType?: string | null;
  titleKey?: string;
  descKey?: string;
  targetStep?: number;
}

export default function CompleteProfileModal({
  open,
  onClose,
  accountType,
  titleKey = "profile.completeProfileRequired",
  descKey = "profile.completeProfileRequiredDesc",
  targetStep,
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useMyProfile();

  const handleComplete = () => {
    const type = accountType ?? profile?.account_type ?? user?.user_metadata?.account_type;
    onClose();
    router.push(profileCompletionPath(type, targetStep));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader className="items-center">
          <DialogTitle className="text-lg font-bold text-gray-900">
            {t(titleKey)}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 mt-1">
            {t(descKey)}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-2">
          <Button
            className="w-full bg-green-700 hover:bg-green-800 text-white"
            onClick={handleComplete}
          >
            {t("header.completeProfile")}
          </Button>
          <Button variant="ghost" className="w-full text-gray-500" onClick={onClose}>
            {t("common.cancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
