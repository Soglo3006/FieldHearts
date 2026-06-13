"use client";

import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DepositType } from "@/lib/deposit";

type Props = {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  type: DepositType;
  onTypeChange: (value: DepositType) => void;
  value: string;
  onValueChange: (value: string) => void;
  /** Hide when pricing is quote without a reference amount */
  pricingMode: string;
  servicePrice?: number | null;
};

export default function DepositFields({
  enabled,
  onEnabledChange,
  type,
  onTypeChange,
  value,
  onValueChange,
  pricingMode,
  servicePrice,
}: Props) {
  const { t } = useTranslation();

  if (pricingMode === "quote" && (servicePrice == null || servicePrice < 0.01)) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-xs text-gray-600">
        {t("deposit.quoteHint")}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
        />
        <span>
          <span className="block text-sm font-medium text-gray-900">{t("deposit.enable")}</span>
          <span className="mt-0.5 block text-xs text-gray-500">{t("deposit.enableHint")}</span>
        </span>
      </label>

      {enabled && (
        <div className="space-y-3 border-t border-gray-200 pt-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            {(
              [
                ["fixed", t("deposit.typeFixed")],
                ["percent", t("deposit.typePercent")],
              ] as const
            ).map(([opt, label]) => (
              <button
                key={opt}
                type="button"
                onClick={() => onTypeChange(opt)}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  type === opt
                    ? "border-green-600 bg-green-50 text-green-900"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="deposit-value">
              {type === "percent" ? t("deposit.percentValue") : t("deposit.fixedValue")}
            </Label>
            <Input
              id="deposit-value"
              type="number"
              min={type === "percent" ? 1 : 0.01}
              max={type === "percent" ? 99 : servicePrice ? servicePrice - 0.01 : undefined}
              step={type === "percent" ? 1 : 0.01}
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              placeholder={type === "percent" ? "20" : "20.00"}
            />
          </div>

          <p className="text-xs text-amber-700">{t("deposit.nonRefundableNotice")}</p>
        </div>
      )}
    </div>
  );
}
