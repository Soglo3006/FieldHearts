"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
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
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <Check className="h-8 w-8 text-red-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">{t("block.blocked")}</h3>
        <p className="text-gray-600">
          {displayName} has been blocked. They will no longer be able to contact you or see your profile.
        </p>
        <Button className="w-full bg-green-700 hover:bg-green-800 text-white cursor-pointer"
          onClick={() => { onClose(); window.location.reload(); }}>
          {t("common.close")}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <p className="text-gray-900 font-bold text-2xl text-center">{t("block.message", { name: displayName })}</p>
      <div className="bg-gray-50 px-4 py-3 rounded-lg space-y-2">
        <p className="text-gray-700 text-sm">When you block this user:</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
          <li>They won't be able to contact you</li>
          <li>You won't see their listings or posts</li>
          <li>They won't be notified that you blocked them</li>
          <li>You can unblock them later in settings</li>
        </ul>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 cursor-pointer" onClick={onBack} disabled={loading}>{t("common.cancel")}</Button>
        <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white cursor-pointer" onClick={handleBlock} disabled={loading}>
          {loading ? t("block.blocking") : t("block.confirm")}
        </Button>
      </div>
    </Card>
  );
}
