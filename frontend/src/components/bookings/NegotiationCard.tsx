"use client";

import { cn } from "@/lib/utils";
import {
  negotiationCardClass,
  negotiationLabelClass,
  negotiationPriceInputClass,
  negotiationRowClass,
  negotiationValueClass,
  partyConfirmCardClass,
} from "./negotiationCardStyles";

export function NegotiationCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(negotiationCardClass, className)}>{children}</div>;
}

export function NegotiationRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className={negotiationRowClass}>
      <p className={negotiationLabelClass}>{label}</p>
      {children ?? <span className={negotiationValueClass}>{value}</span>}
    </div>
  );
}

export function NegotiationPriceInput({
  id,
  value,
  onChange,
  onBlur,
  min,
  max,
  "aria-label": ariaLabel,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  min?: number;
  max?: number;
  "aria-label"?: string;
  disabled?: boolean;
}) {
  return (
    <div className="relative shrink-0">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
        $
      </span>
      <input
        id={id}
        type="number"
        min={min ?? 0.01}
        max={max}
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        aria-label={ariaLabel}
        className={negotiationPriceInputClass}
      />
    </div>
  );
}

export function PartyConfirmCard({
  label,
  confirmed,
  isMe,
  pendingLabel,
}: {
  label: string;
  confirmed: boolean;
  isMe: boolean;
  pendingLabel: string;
}) {
  return (
    <div className={partyConfirmCardClass(confirmed, isMe)}>
      <div className={negotiationRowClass}>
        <span className={cn(negotiationLabelClass, "flex items-center gap-1.5 min-w-0")}>
          <span
            className={cn(
              "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
              confirmed ? "bg-green-600 text-white" : "bg-gray-200 text-gray-500",
            )}
            aria-hidden
          >
            {confirmed ? "✓" : "·"}
          </span>
          {label}
        </span>
        <span
          className={cn(
            negotiationValueClass,
            confirmed ? "text-green-700" : "text-gray-500 text-xs font-medium",
          )}
        >
          {confirmed ? "✓" : pendingLabel}
        </span>
      </div>
    </div>
  );
}
