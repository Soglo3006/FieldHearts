"use client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ban } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  isBlocked: boolean;
  isBlockedByOther: boolean;
  blockLoading: boolean;
  onUnblock: () => void;
}

export default function BlockedBanner({ isBlocked, isBlockedByOther, blockLoading, onUnblock }: Props) {
  const { t } = useTranslation();

  if (isBlocked) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <Ban className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{t("blockedBanner.blockedTitle")}</h3>
          <p className="text-gray-500 mb-6">{t("blockedBanner.blockedDescription")}</p>
          <Button
            variant="outline"
            className="border-green-600 text-green-600 hover:bg-green-50 cursor-pointer"
            onClick={onUnblock}
            disabled={blockLoading}
          >
            {blockLoading ? t("blockedBanner.unblocking") : t("blockedBanner.unblock")}
          </Button>
        </div>
      </Card>
    );
  }

  if (isBlockedByOther) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <Ban className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{t("blockedBanner.hiddenTitle")}</h3>
          <p className="text-gray-500">{t("blockedBanner.hiddenDescription")}</p>
        </div>
      </Card>
    );
  }

  return null;
}
