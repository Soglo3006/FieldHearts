"use client";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Bookmark, Share2 } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthGate } from "@/hooks/useAuthGate";
import { useAuthResumeAction } from "@/hooks/useAuthResumeAction";
import { toast } from "sonner";
import CompleteProfileModal from "@/components/profile/CompleteProfileModal";

interface Props {
  serviceId: string;
  title: string;
  ownerId?: string;
}

export default function SaveShareActions({ serviceId, title, ownerId }: Props) {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { requireAuth, notifyAuthActionReady } = useAuthGate();
  const { isSaved, toggle, showCompleteProfile, setShowCompleteProfile } = useFavorites();
  const saved = Boolean(user) && isSaved(serviceId);
  const isOwner = !!user && !!ownerId && user.id === ownerId;

  useAuthResumeAction("favorite", (payload) => {
    if (payload.serviceId === serviceId) {
      void toggle(serviceId);
    }
  });

  const saveListing = () => {
    void toggle(serviceId);
  };

  const saveListingAfterAuth = () => {
    saveListing();
    notifyAuthActionReady();
  };

  const handleSave = () => {
    if (authLoading) return;
    if (!requireAuth({
      context: "favorite",
      redirect: `/serviceDetail/${serviceId}`,
      from: "favorite",
      onSuccess: saveListingAfterAuth,
      resume: { type: "favorite", payload: { serviceId } },
    })) {
      return;
    }
    saveListing();
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success(t("serviceDetail.linkCopied"));
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        toast.success(t("serviceDetail.linkCopied"));
      } catch {
        toast.success(t("serviceDetail.linkCopied"));
      }
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 mt-3">
        {!isOwner && (
          <Button variant="outline" className="gap-2" onClick={handleSave}>
            <Bookmark className={`h-4 w-4 ${saved ? "fill-green-700 text-green-700" : ""}`} />
            {saved ? t("serviceDetail.saved") : t("serviceDetail.save")}
          </Button>
        )}
        <Button variant="outline" className="gap-2" onClick={handleShare}>
          <Share2 className="h-4 w-4" />
          {t("serviceDetail.share")}
        </Button>
      </div>
      <CompleteProfileModal
        open={showCompleteProfile}
        onClose={() => setShowCompleteProfile(false)}
      />
    </>
  );
}
