"use client";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Bookmark, Share2 } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import CompleteProfileModal from "@/components/profile/CompleteProfileModal";

interface Props {
  serviceId: string;
  title: string;
}

export default function SaveShareActions({ serviceId, title }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isSaved, toggle, showCompleteProfile, setShowCompleteProfile } = useFavorites();
  const saved = Boolean(user) && isSaved(serviceId);

  const handleSave = () => {
    if (authLoading) return;
    if (!user) {
      const path = `/serviceDetail/${serviceId}`;
      router.push(`/login?redirect=${encodeURIComponent(path)}&from=favorite`);
      return;
    }
    void toggle(serviceId);
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
        <Button variant="outline" className="gap-2" onClick={handleSave}>
          <Bookmark className={`h-4 w-4 ${saved ? "fill-green-700 text-green-700" : ""}`} />
          {saved ? t("serviceDetail.saved") : t("serviceDetail.save")}
        </Button>
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
