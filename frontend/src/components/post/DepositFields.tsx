"use client";

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { DepositType } from "@/lib/deposit";
import {
  getDepositValueInputMax,
  isDepositFormValueValid,
  resolveDepositFixedMaxForListing,
} from "@/lib/deposit";
import type { ListingPricingFields } from "@/lib/listingPrice";

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
  pricingFields?: ListingPricingFields;
  /** When true, renders only the checkbox (expanded options rendered separately) */
  compact?: boolean;
};

/** Expanded deposit type + amount (fixed/range/hourly blocks). */
export function DepositValueSection({
  type,
  onTypeChange,
  value,
  onValueChange,
  pricingFields,
  inputId = "deposit-value",
}: {
  type: DepositType;
  onTypeChange: (value: DepositType) => void;
  value: string;
  onValueChange: (value: string) => void;
  pricingFields: ListingPricingFields;
  inputId?: string;
}) {
  const { t } = useTranslation();
  const inputMax = getDepositValueInputMax(type, pricingFields);
  const maxFixed = resolveDepositFixedMaxForListing(pricingFields);
  const valid = isDepositFormValueValid(true, type, value, pricingFields);
  const showError = value.trim() !== "" && !valid;

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
      <div className="grid grid-cols-2 gap-2">
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
        <Label htmlFor={inputId}>
          {type === "percent" ? t("deposit.percentValue") : t("deposit.fixedValue")}
        </Label>
        <Input
          id={inputId}
          type="number"
          min={type === "percent" ? 1 : 0.01}
          max={inputMax}
          step={type === "percent" ? 1 : 0.01}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={type === "percent" ? "20" : "20.00"}
          className={cn(showError && "border-red-500 focus-visible:ring-red-500/30")}
        />
        {showError && (
          <p className="text-xs text-red-500">
            {type === "percent"
              ? t("deposit.percentMaxError")
              : t("deposit.exceedsPriceError", { max: maxFixed?.toFixed(2) ?? "0.00" })}
          </p>
        )}
      </div>
      <p className="text-xs text-red-500">{t("deposit.nonRefundableNotice")}</p>
    </div>
  );
}

/** Price input + deposit on one row (mobile flex; desktop grid with aligned labels). */
export function PriceDepositInputRow({
  label,
  children,
  ...depositProps
}: Omit<Props, "compact"> & { label: ReactNode; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <div className="sm:grid sm:grid-cols-2 sm:gap-4">
        <div>{label}</div>
        <Label
          className="mb-0 hidden text-base font-medium text-gray-900 invisible select-none pointer-events-none sm:block"
          aria-hidden="true"
        >
          {t("deposit.paymentLine")}
        </Label>
      </div>
      <div className="flex items-stretch gap-3 sm:grid sm:grid-cols-2 sm:gap-4">
        {children}
        <div className="min-w-0 flex-1 sm:flex-none sm:min-w-[12rem]">
          <DepositFields {...depositProps} compact />
        </div>
      </div>
    </div>
  );
}

/** Deposit checkbox aligned with price inputs (label spacer matches field labels on sm+). */
export function DepositFieldAlignedColumn(props: Omit<Props, "compact">) {
  const { t } = useTranslation();
  return (
    <div className="min-w-0 flex-1 sm:flex-none sm:min-w-[12rem]">
      <Label
        className="mb-2 hidden text-base font-medium text-gray-900 invisible select-none pointer-events-none sm:block"
        aria-hidden="true"
      >
        {t("deposit.paymentLine")}
      </Label>
      <DepositFields {...props} compact />
    </div>
  );
}

export default function DepositFields({
  enabled,
  onEnabledChange,
  type,
  onTypeChange,
  value,
  onValueChange,
  pricingMode,
  servicePrice,
  pricingFields,
  compact = false,
}: Props) {
  const { t } = useTranslation();

  if (pricingMode === "quote") {
    const refPrice =
      servicePrice ??
      (pricingFields?.price != null ? Number(pricingFields.price) : null);
    if (refPrice == null || refPrice < 0.01) {
      return (
        <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-xs text-gray-600">
          {t("deposit.quoteHint")}
        </div>
      );
    }
  }

  return (
    <div className={`rounded-xl border border-gray-200 bg-gray-50/60 ${compact ? "h-12 px-3 flex items-center" : "p-4 space-y-3"}`}>
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="h-4 w-4 shrink-0 rounded border-gray-300 text-green-600 focus:ring-green-500"
        />
        <span className="flex items-center gap-1">
          <span className="text-xs font-medium text-gray-900 leading-tight">
            {compact ? t("deposit.paymentLine") : t("deposit.enable")}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-gray-400 hover:text-gray-600 flex items-center shrink-0">
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px] text-center">
              {t("deposit.enableHint")}
            </TooltipContent>
          </Tooltip>
        </span>
      </label>

      {!compact && enabled && pricingFields && (
        <DepositValueSection
          type={type}
          onTypeChange={onTypeChange}
          value={value}
          onValueChange={onValueChange}
          pricingFields={pricingFields}
        />
      )}

      {!compact && enabled && !pricingFields && pricingMode === "quote" && servicePrice != null && servicePrice >= 0.01 && (
        <DepositValueSection
          type={type}
          onTypeChange={onTypeChange}
          value={value}
          onValueChange={onValueChange}
          pricingFields={{ pricing_mode: "quote", price: servicePrice }}
          inputId="deposit-value-quote"
        />
      )}

      {!compact && enabled && !pricingFields && pricingMode !== "quote" && (
        <div className="space-y-3 border-t border-gray-200 pt-3">
          <div className="grid grid-cols-2 gap-2">
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
              max={type === "percent" ? 100 : servicePrice ?? undefined}
              step={type === "percent" ? 1 : 0.01}
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              placeholder={type === "percent" ? "20" : "20.00"}
            />
          </div>

          <p className="text-xs text-red-500">{t("deposit.nonRefundableNotice")}</p>
        </div>
      )}
    </div>
  );
}
