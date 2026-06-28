"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { normalizePricingMode } from "@/lib/listingPrice";
import RangePriceFields, {
  clampToRange,
  formatAgreedRangeLabel,
  formatPriceInput,
  getInitialRangeMax,
  getInitialRangeMin,
  getListingRangeBounds,
  isRangeInputValid,
  parsePriceInput,
} from "./RangePriceFields";
import { NegotiationCard, NegotiationRow } from "./NegotiationCard";
import {
  getInitialDepositFormState,
  hasActiveDepositConfig,
  type DepositType,
} from "@/lib/deposit";

interface Booking {
  id: string;
  status: string;
  worker_note?: string | null;
  custom_price?: number | null;
  custom_price_min?: number | null;
  custom_price_max?: number | null;
  price: string | number;
  price_max?: number | string | null;
  pricing_mode?: string | null;
  estimated_hours?: number | string | null;
  deposit_enabled?: boolean;
  deposit_type?: string | null;
  deposit_value?: number | string | null;
}

interface Props {
  booking: Booking;
  accessToken: string;
  onSaved: (data: Record<string, unknown>) => void;
}

export default function WorkerCustomizeSection({ booking, accessToken, onSaved }: Props) {
  const { t } = useTranslation();
  const pricingMode = normalizePricingMode(booking.pricing_mode);
  const isHourly = pricingMode === "hourly";
  const isQuote = pricingMode === "quote";
  const isRange = pricingMode === "range";
  const rangeBounds = useMemo(() => getListingRangeBounds(booking), [booking]);
  const initialDeposit = useMemo(() => getInitialDepositFormState(booking), [
    booking.deposit_type,
    booking.deposit_value,
    booking.id,
  ]);

  const [editing, setEditing] = useState(false);
  const [editNote, setEditNote] = useState(booking.worker_note ?? "");
  const [editPrice, setEditPrice] = useState(() => {
    const custom = booking.custom_price != null ? Number(booking.custom_price) : null;
    if (isQuote) {
      return custom != null && Number.isFinite(custom) && custom >= 0.01 ? String(custom) : "";
    }
    return String(booking.custom_price ?? booking.price ?? "");
  });
  const [editPriceMin, setEditPriceMin] = useState(() => getInitialRangeMin(booking, rangeBounds));
  const [editPriceMax, setEditPriceMax] = useState(() => getInitialRangeMax(booking, rangeBounds));
  const [editHours, setEditHours] = useState(
    booking.estimated_hours != null && booking.estimated_hours !== ""
      ? String(Math.round(Number(booking.estimated_hours)))
      : ""
  );
  const [editDepositType, setEditDepositType] = useState<DepositType>(() => initialDeposit.type);
  const [editDepositValue, setEditDepositValue] = useState(() => initialDeposit.value);
  const [saving, setSaving] = useState(false);

  const resetDepositFields = () => {
    const initial = getInitialDepositFormState(booking);
    setEditDepositType(initial.type);
    setEditDepositValue(initial.value);
  };

  useEffect(() => {
    if (!editing) resetDepositFields();
  }, [booking.deposit_type, booking.deposit_value, booking.id, editing]);

  useEffect(() => {
    setEditPriceMin(getInitialRangeMin(booking, rangeBounds));
    setEditPriceMax(getInitialRangeMax(booking, rangeBounds));
  }, [booking.custom_price_min, booking.custom_price_max, booking.custom_price, booking.id, rangeBounds?.min, rangeBounds?.max]);

  const handleRangeBlurMin = () => {
    const parsed = parsePriceInput(editPriceMin);
    if (parsed == null) {
      setEditPriceMin(getInitialRangeMin(booking, rangeBounds));
      return;
    }
    setEditPriceMin(formatPriceInput(clampToRange(parsed, rangeBounds)));
  };

  const handleRangeBlurMax = () => {
    const parsed = parsePriceInput(editPriceMax);
    if (parsed == null) {
      setEditPriceMax(getInitialRangeMax(booking, rangeBounds));
      return;
    }
    setEditPriceMax(formatPriceInput(clampToRange(parsed, rangeBounds)));
  };

  const agreedQuotePrice =
    isQuote &&
    booking.custom_price != null &&
    Number(booking.custom_price) >= 0.01;
  const showDepositFields = !isQuote || agreedQuotePrice;

  const save = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { worker_note: editNote };
      if (isHourly) {
        const hours = Number(editHours);
        if (Number.isFinite(hours) && hours > 0) body.estimated_hours = hours;
      } else if (isRange) {
        if (isRangeInputValid(editPriceMin, editPriceMax, rangeBounds)) {
          body.custom_price_min = parsePriceInput(editPriceMin);
          body.custom_price_max = parsePriceInput(editPriceMax);
        }
      } else if (!isQuote && editPrice.trim() !== "") {
        body.custom_price = Number(editPrice);
      }
      if (editDepositValue.trim() !== "") {
        body.deposit_type = editDepositType;
        body.deposit_value = Number(editDepositValue);
      } else if (hasActiveDepositConfig(booking) || isQuote) {
        body.deposit_type = null;
        body.deposit_value = 0;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${booking.id}/customize`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) return;
      const data = await res.json();
      onSaved(data);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const agreedRangeLabel = formatAgreedRangeLabel(
    booking.custom_price_min,
    booking.custom_price_max,
    t,
  );

  return (
    <div className="border border-dashed border-gray-300 rounded-xl px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{t("customizeBooking.title")}</p>
        {!editing && (
          <button
            onClick={() => {
              resetDepositFields();
              setEditNote(booking.worker_note ?? "");
              setEditing(true);
            }}
            className="text-xs text-green-700 hover:underline"
          >
            {t("common.edit")}
          </button>
        )}
      </div>
      {editing ? (
        <>
          {!isHourly && isRange && (
            <NegotiationCard>
              <RangePriceFields
                idPrefix="customizeRange"
                compact
                listingBounds={rangeBounds}
                valueMin={editPriceMin}
                valueMax={editPriceMax}
                onChangeMin={setEditPriceMin}
                onChangeMax={setEditPriceMax}
                onBlurMin={handleRangeBlurMin}
                onBlurMax={handleRangeBlurMax}
              />
            </NegotiationCard>
          )}
          {!isHourly && !isRange && !isQuote && (
            <div>
              <label htmlFor="customizeBookingPrice" className="text-xs text-gray-500 mb-1 block">
                {t("customizeBooking.customPriceLabel")}
              </label>
              <input
                id="customizeBookingPrice"
                type="number"
                min="0"
                step="0.01"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
          )}
          {isQuote && agreedQuotePrice && (
            <NegotiationCard>
              <NegotiationRow
                label={t("customizeBooking.agreedPriceLabel")}
                value={`${Number(booking.custom_price).toFixed(2)} $`}
              />
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{t("customizeBooking.quotePriceLockedHint")}</p>
            </NegotiationCard>
          )}
          {isHourly && (
            <div>
              <label htmlFor="customizeBookingHours" className="text-xs text-gray-500 mb-1 block">
                {t("post.estimatedHoursLabel")}
              </label>
              <input
                id="customizeBookingHours"
                type="number"
                min="1"
                step="1"
                value={editHours}
                onChange={(e) => setEditHours(e.target.value)}
                className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
          )}
          {showDepositFields && (
          <div>
            <label className="text-xs text-gray-500 mb-1 block">{t("deposit.enable")}</label>
            <div className="flex gap-2">
              <select
                value={editDepositType}
                onChange={(e) => setEditDepositType(e.target.value as DepositType)}
                aria-label={t("deposit.typeFixed")}
                className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 w-32"
              >
                <option value="fixed">{t("deposit.typeFixed")}</option>
                <option value="percent">{t("deposit.typePercent")}</option>
              </select>
              <input
                type="number"
                min="0"
                step={editDepositType === "percent" ? "1" : "0.01"}
                max={editDepositType === "percent" ? "100" : undefined}
                value={editDepositValue}
                onChange={(e) => setEditDepositValue(e.target.value)}
                placeholder={editDepositType === "percent" ? "0" : "0.00"}
                className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
            {isQuote && (
              <p className="text-xs text-gray-400 mt-1">{t("customizeBooking.quoteDepositHint")}</p>
            )}
          </div>
          )}

          <div>
            <label htmlFor="customizeBookingNote" className="text-xs text-gray-500 mb-1 block">{t("customizeBooking.noteLabel")}</label>
            <textarea
              id="customizeBookingNote"
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              rows={3}
              placeholder={t("customizeBooking.notePlaceholder")}
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-green-700 hover:bg-green-800 text-white"
              onClick={save}
              disabled={saving || (isRange && !isRangeInputValid(editPriceMin, editPriceMax, rangeBounds))}
            >
              {saving ? t("customizeBooking.saving") : t("common.save")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                resetDepositFields();
                setEditNote(booking.worker_note ?? "");
                setEditing(false);
              }}
              disabled={saving}
            >
              {t("common.cancel")}
            </Button>
          </div>
        </>
      ) : (
        <>
          {isHourly && booking.estimated_hours != null && (
            <p className="text-sm text-gray-700">
              {t("post.estimatedHoursLabel")}:{" "}
              <span className="font-semibold text-green-700">{Number(booking.estimated_hours)} h</span>
            </p>
          )}
          {isRange && agreedRangeLabel && (
            <NegotiationCard>
              <NegotiationRow label={t("customizeBooking.customRangeValue")} value={agreedRangeLabel} />
            </NegotiationCard>
          )}
          {!isHourly && !isRange && !isQuote && booking.custom_price != null && Number(booking.custom_price) >= 0.01 && (
            <p className="text-sm text-gray-700">
              {t("customizeBooking.customPriceValue")}{" "}
              <span className="font-semibold text-green-700">${Number(booking.custom_price)}</span>
            </p>
          )}
          {isQuote && agreedQuotePrice && (
            <p className="text-sm text-gray-700">
              {t("customizeBooking.agreedPriceLabel")}:{" "}
              <span className="font-semibold text-green-700">{Number(booking.custom_price).toFixed(2)} $</span>
            </p>
          )}
          {booking.worker_note && <p className="text-sm text-gray-600 whitespace-pre-line">{booking.worker_note}</p>}
          {hasActiveDepositConfig(booking) && (
            <p className="text-sm text-gray-700">
              {t("deposit.enable")}:{" "}
              <span className="font-semibold text-green-700">
                {booking.deposit_type === "percent"
                  ? `${Number(booking.deposit_value)} %`
                  : `${Number(booking.deposit_value).toFixed(2)} $`}
              </span>
            </p>
          )}
          {isQuote && !hasActiveDepositConfig(booking) && !booking.worker_note && (
            <p className="text-xs text-gray-400 italic leading-relaxed">{t("customizeBooking.quoteAfterAgreementEmpty")}</p>
          )}
          {!isQuote && !booking.custom_price && !booking.custom_price_min && !booking.worker_note && !booking.estimated_hours && (
            <p className="text-xs text-gray-400 italic">{t("customizeBooking.empty")}</p>
          )}
        </>
      )}
    </div>
  );
}
