"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Building2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { SubPageHeader } from "./SubPageHeader";
import { useTranslation } from "react-i18next";
import { Spinner } from "@/components/ui/Spinner";

interface BlockedUser {
  id: string;
  name: string;
  avatar: string;
  account_type: string;
  blocked_at: string;
}

interface Props {
  onBack: () => void;
  onClose: () => void;
}

export default function BlockedUsersPage({ onBack, onClose }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlockedUsers = async () => {
      if (!user) return;
      try {
        const { data: blocks, error: blocksError } = await supabase
          .from("blocked_users").select("blocked_user_id, created_at")
          .eq("blocker_id", user.id).order("created_at", { ascending: false });
        if (blocksError) throw blocksError;
        if (blocks && blocks.length > 0) {
          const userPromises = blocks.map(async (b) => {
            try {
              const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profiles/${b.blocked_user_id}`);
              if (response.ok) {
                const userData = await response.json();
                return {
                  id: b.blocked_user_id,
                  name: userData.account_type === "person" ? userData.full_name : userData.company_name,
                  avatar: userData.avatar,
                  account_type: userData.account_type,
                  blocked_at: b.created_at,
                };
              }
              return null;
            } catch { return null; }
          });
          const users = await Promise.all(userPromises);
          setBlockedUsers(users.filter((u): u is BlockedUser => u !== null));
        }
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };
    fetchBlockedUsers();
  }, [user]);

  const handleUnblock = async (userId: string) => {
    if (!user) return;
    const confirmed = window.confirm(t("settings.unblockConfirm"));
    if (!confirmed) return;
    setUnblocking(userId);
    try {
      const { error } = await supabase.from("blocked_users").delete()
        .eq("blocker_id", user.id).eq("blocked_user_id", userId);
      if (error) throw error;
      setBlockedUsers(blockedUsers.filter(u => u.id !== userId));
    } catch (err) {
    } finally {
      setUnblocking(null);
    }
  };

  const subtitle = blockedUsers.length === 0
    ? t("settings.noBlockedYet")
    : `${blockedUsers.length} ${blockedUsers.length > 1 ? t("settings.blockedUsers") : t("settings.blockedUsers")}`;

  return (
    <div className="bg-gray-50">
      <SubPageHeader
        title={t("settings.blockedUsers")}
        subtitle={subtitle}
        onBack={onBack}
        onClose={onClose}
      />
      <div className="px-3 sm:px-4 py-4 sm:py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="xl" />
          </div>
        ) : blockedUsers.length === 0 ? (
          <Card className="p-8 sm:p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <Shield className="h-8 w-8 text-gray-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{t("settings.noBlockedUsers")}</h3>
            <p className="text-gray-600 text-sm mt-1">{t("settings.noBlockedUsersDesc")}</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {blockedUsers.map((blockedUser) => (
              <Card key={blockedUser.id} className="p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-gray-200 shrink-0">
                      <AvatarImage src={blockedUser.avatar} alt={blockedUser.name} />
                      <AvatarFallback className="bg-green-100 text-green-800 text-sm font-semibold">{blockedUser.name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm">{blockedUser.name}</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {t("settings.blockedOn")} {new Date(blockedUser.blocked_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="cursor-pointer hover:bg-green-50 hover:border-green-600 hover:text-green-600 shrink-0 text-xs"
                    onClick={() => handleUnblock(blockedUser.id)} disabled={unblocking === blockedUser.id}>
                    {unblocking === blockedUser.id ? "..." : t("settings.unblock")}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
