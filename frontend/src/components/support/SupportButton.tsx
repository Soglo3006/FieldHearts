"use client";
import { useCallback, useState } from "react";
import { MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import SupportModal from "./SupportModal";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthGate } from "@/hooks/useAuthGate";
import { useAuthResumeAction } from "@/hooks/useAuthResumeAction";
import { useTranslation } from "react-i18next";

export default function SupportButton({ floating = false }: { floating?: boolean }) {
  const { user } = useAuth();
  const { requireAuth } = useAuthGate();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const openSupportModal = useCallback(() => {
    setOpen(true);
  }, []);

  useAuthResumeAction("support", () => {
    openSupportModal();
  });

  const handleOpen = () => {
    if (!user) {
      requireAuth({
        context: "support",
        from: "support",
        onSuccess: openSupportModal,
        resume: { type: "support" },
      });
      return;
    }
    openSupportModal();
  };

  return (
    <>
      <Button
        className={`cursor-pointer bg-green-700 text-white hover:bg-green-800 ${floating ? "fixed bottom-6 right-6 z-40" : ""}`}
        onClick={handleOpen}
      >
        <MessageSquareText className="mr-2 h-4 w-4" />
        {t("support.button")}
      </Button>
      <SupportModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
