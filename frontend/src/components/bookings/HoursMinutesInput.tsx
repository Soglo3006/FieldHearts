"use client";

import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  hours: string;
  minutes: string;
  onHoursChange: (value: string) => void;
  onMinutesChange: (value: string) => void;
  onFocus?: () => void;
  idPrefix: string;
  className?: string;
  label?: string;
};

export default function HoursMinutesInput({
  hours,
  minutes,
  onHoursChange,
  onMinutesChange,
  onFocus,
  idPrefix,
  className,
  label,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className={cn("space-y-1", className)}>
      {label && <Label className="text-xs">{label}</Label>}
      <div className="flex gap-2">
        <div className="flex-1 space-y-1 min-w-0">
          <Label htmlFor={`${idPrefix}-hours`} className="text-[11px] text-gray-500 font-normal">
            {t("workSessions.hoursUnit")}
          </Label>
          <Input
            id={`${idPrefix}-hours`}
            type="number"
            min={0}
            max={24}
            step={1}
            inputMode="numeric"
            value={hours}
            onChange={(e) => onHoursChange(e.target.value)}
            onFocus={onFocus}
            placeholder="0"
            className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
        <div className="flex-1 space-y-1 min-w-0">
          <Label htmlFor={`${idPrefix}-minutes`} className="text-[11px] text-gray-500 font-normal">
            {t("workSessions.minutesUnit")}
          </Label>
          <Input
            id={`${idPrefix}-minutes`}
            type="number"
            min={0}
            max={59}
            step={1}
            inputMode="numeric"
            value={minutes}
            onChange={(e) => onMinutesChange(e.target.value)}
            onFocus={onFocus}
            placeholder="0"
            className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
      </div>
    </div>
  );
}
