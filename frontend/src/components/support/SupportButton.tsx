"use client";
import { useState } from "react";
import { MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import SupportModal from "./SupportModal";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useTranslation } from "react-i18next";

export default function SupportButton({ floating = false }: { floating?: boolean }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const trigger = (
    <Button
      className={`bg-green-700 text-white hover:bg-green-800 cursor-pointer ${floating ? "fixed bottom-6 right-6 z-40" : ""}`}
      onClick={() => setOpen(true)}
    >
      <MessageSquareText className="h-4 w-4 mr-2" />
      {t("support.button")}
    </Button>
  );

  return (
    <>
      {user ? (
        trigger
      ) : (
        <Link href="/login">{trigger}</Link>
      )}
      <SupportModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
