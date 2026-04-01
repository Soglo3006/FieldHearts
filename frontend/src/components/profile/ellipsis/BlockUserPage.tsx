"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Check, ShieldX } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";

interface Props {
  profileId: string;
  displayName: string;
  onBack: () => void;
  onClose: () => void;
}

export default function BlockUserPage({ profileId, displayName, onBack, onClose }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleBlock = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("blocked_users").insert({ blocker_id: user.id, blocked_user_id: profileId });
      if (error) throw error;
      setSuccess(true);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <Check className="h-7 w-7 text-red-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">{t("block.blocked")}</h3>
        <p className="text-sm text-gray-600">
          {t("block.blockedDescription", { name: displayName })}
        </p>
        <Button className="w-full bg-green-700 hover:bg-green-800 text-white cursor-pointer"
          onClick={() => { onClose(); window.location.reload(); }}>
          {t("common.close")}
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col items-center text-center gap-3 py-2">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center">
          <ShieldX className="h-7 w-7 text-red-500" />
        </div>
        <p className="text-base font-bold text-gray-900">{t("block.message", { name: displayName })}</p>
      </div>

      <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5">
        <p className="text-sm font-medium text-gray-700">{t("block.consequencesTitle")}</p>
        <ul className="space-y-1 text-sm text-gray-600">
          <li className="flex items-start gap-2"><span className="text-gray-400 mt-0.5">•</span>{t("block.consequenceContact")}</li>
          <li className="flex items-start gap-2"><span className="text-gray-400 mt-0.5">•</span>{t("block.consequenceListings")}</li>
          <li className="flex items-start gap-2"><span className="text-gray-400 mt-0.5">•</span>{t("block.consequenceNoNotification")}</li>
          <li className="flex items-start gap-2"><span className="text-gray-400 mt-0.5">•</span>{t("block.consequenceUnblockLater")}</li>
        </ul>
      </div>

      <div className="flex gap-3 pt-1">
        <Button variant="outline" className="flex-1 cursor-pointer" onClick={onBack} disabled={loading}>{t("common.cancel")}</Button>
        <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white cursor-pointer" onClick={handleBlock} disabled={loading}>
          {loading ? t("block.blocking") : t("block.confirm")}
        </Button>
      </div>
    </div>
  );
}
