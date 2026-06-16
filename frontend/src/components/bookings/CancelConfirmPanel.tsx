"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  mode: "deposit" | "dispute";
  updating: boolean;
  onBack: () => void;
  onConfirmDeposit: () => void;
  onProceedDispute: () => void;
}

export default function CancelConfirmPanel({
  mode,
  updating,
  onBack,
  onConfirmDeposit,
  onProceedDispute,
}: Props) {
  const { t } = useTranslation();
  const isDeposit = mode === "deposit";
  const ns = isDeposit ? "deposit" : "bookings";

  const points = [
    t(`${ns}.cancelPanelPoint1`),
    t(`${ns}.cancelPanelPoint2`),
    t(`${ns}.cancelPanelPoint3`),
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex flex-1 min-h-0 items-center justify-center overflow-y-auto px-5 py-6">
        <div className="w-full max-w-sm space-y-4">
          <div className="text-center space-y-2">
            <h3 className="text-base font-semibold text-gray-900">
              {t(`${ns}.cancelPanelTitle`)}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {t(`${ns}.cancelPanelLead`)}
            </p>
          </div>

          <div className="rounded-xl px-5 py-4 space-y-3">
            <ul className="space-y-3 text-sm text-gray-600 leading-relaxed">
              {points.map((point) => (
                <li key={point} className="flex gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" aria-hidden />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="shrink-0 px-5 py-4 border-t border-gray-100 flex flex-col gap-2">
        {isDeposit ? (
          <Button
            className="w-full bg-red-600 hover:bg-red-700 text-white h-11"
            onClick={onConfirmDeposit}
            disabled={updating}
          >
            {updating ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("common.loading")}
              </span>
            ) : (
              t("deposit.confirmCancel")
            )}
          </Button>
        ) : (
          <Button
            className="w-full bg-red-600 hover:bg-red-700 text-white h-11"
            onClick={onProceedDispute}
            disabled={updating}
          >
            {t("bookings.openDisputeInstead")}
          </Button>
        )}
        <Button variant="outline" className="w-full h-11" onClick={onBack} disabled={updating}>
          {t("bookings.keepBooking")}
        </Button>
      </div>
    </div>
  );
}
