import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight, ShieldAlert, UserRoundPlus, ArrowLeft, X } from "lucide-react";
import ReportUserPage from "./ellipsis/ReportUserPage";
import ReportListingPage from "./ellipsis/ReportListingPage";
import BlockUserPage from "./ellipsis/BlockUserPage";
import ShareProfilePage from "./ellipsis/ShareProfilePage";

type Screen = "default" | "reportUser" | "reportListing" | "blockUser" | "shareProfile";

interface Props {
  onClose: () => void;
  profileId: string;
  displayName: string;
  userListings: { id: string; title: string; price: string | number | null; image_url?: string | null }[];
}

export default function EllipsisPage({ onClose, profileId, displayName, userListings }: Props) {
  const { t } = useTranslation();
  const [screen, setScreen] = useState<Screen>("default");

  const SCREEN_TITLES: Record<Screen, string> = {
    default: t("profile.profileOptions"),
    reportUser: t("profile.reportUser"),
    reportListing: t("report.reportListing"),
    blockUser: t("profile.blockUser"),
    shareProfile: t("profile.shareProfile"),
  };

  return (
    <div className="flex min-h-full w-full flex-col bg-white">
      {/* Header */}
      <div className="bg-white border-b shrink-0">
        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Nav row: back | title | close */}
        <div className="flex items-center gap-3 px-4 py-3 sm:py-4">
          {/* Back button — same width as close so title stays centred */}
          <div className="w-8 shrink-0">
            {screen !== "default" && (
              <button
                type="button"
                onClick={() => setScreen("default")}
                aria-label={t("common.back")}
                title={t("common.back")}
                className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 cursor-pointer transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Title */}
          <h1 className="flex-1 text-center text-lg sm:text-xl font-bold text-gray-900 truncate">
            {SCREEN_TITLES[screen]}
          </h1>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            title={t("common.close")}
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 cursor-pointer transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="w-full flex-1 px-4 py-3 sm:px-8 sm:py-6">
        {screen === "default" && (
          <div className="mx-auto grid w-full max-w-3xl gap-3">
            <Card className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <ShieldAlert className="h-5 w-5 text-green-700 shrink-0" />
                <h2 className="text-base font-semibold text-gray-900">{t("profile.reportSafety")}</h2>
              </div>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-between cursor-pointer" onClick={() => setScreen("reportUser")}>
                  <span>{t("profile.reportUser")}</span><ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="w-full justify-between cursor-pointer" onClick={() => setScreen("reportListing")}>
                  <span>{t("report.reportListing")}</span><ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="w-full justify-between border-red-200 text-red-600 hover:bg-red-50 cursor-pointer" onClick={() => setScreen("blockUser")}>
                  <span>{t("profile.blockUser")}</span><ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <UserRoundPlus className="h-5 w-5 text-green-700 shrink-0" />
                <h2 className="text-base font-semibold text-gray-900">{t("profile.profileActions")}</h2>
              </div>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-between cursor-pointer" onClick={() => setScreen("shareProfile")}>
                  <span>{t("profile.shareProfile")}</span><ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>
        )}

        {screen === "reportUser"    && <ReportUserPage    profileId={profileId} displayName={displayName} onClose={onClose} />}
        {screen === "reportListing" && <ReportListingPage profileId={profileId} displayName={displayName} userListings={userListings} onClose={onClose} />}
        {screen === "blockUser"     && <BlockUserPage     profileId={profileId} displayName={displayName} onBack={() => setScreen("default")} onClose={onClose} />}
        {screen === "shareProfile"  && <ShareProfilePage  profileId={profileId} displayName={displayName} />}
      </div>
    </div>
  );
}
