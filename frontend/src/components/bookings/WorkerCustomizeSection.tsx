"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { normalizePricingMode } from "@/lib/listingPrice";

interface Booking {
  id: string;
  status: string;
  worker_note?: string | null;
  custom_price?: number | null;
  price: string | number;
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

  const [editing, setEditing] = useState(false);
  const [editNote, setEditNote] = useState(booking.worker_note ?? "");
  const [editPrice, setEditPrice] = useState(String(booking.custom_price ?? booking.price ?? ""));
  const [editHours, setEditHours] = useState(
    booking.estimated_hours != null && booking.estimated_hours !== ""
      ? String(Math.round(Number(booking.estimated_hours)))
      : ""
  );
  const [editDepositType, setEditDepositType] = useState(booking.deposit_type ?? "percent");
  const [editDepositValue, setEditDepositValue] = useState(String(booking.deposit_value ?? ""));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { worker_note: editNote };
      if (isHourly) {
        const hours = Number(editHours);
        if (Number.isFinite(hours) && hours > 0) body.estimated_hours = hours;
      } else if (editPrice.trim() !== "") {
        body.custom_price = Number(editPrice);
      }
      if (editDepositValue.trim() !== "") {
        body.deposit_type = editDepositType;
        body.deposit_value = Number(editDepositValue);
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

  return (
    <div className="border border-dashed border-gray-300 rounded-xl px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{t("customizeBooking.title")}</p>
        {!editing && (
          <button onClick={() => setEditing(true)} className="text-xs text-green-700 hover:underline">
            {t("common.edit")}
          </button>
        )}
      </div>
      {editing ? (
        <>
          {!isHourly && (
            <div>
              <label htmlFor="customizeBookingPrice" className="text-xs text-gray-500 mb-1 block">
                {isQuote ? t("customizeBooking.customPriceLabel") : t("customizeBooking.customPriceLabel")}
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
          <div>
            <label className="text-xs text-gray-500 mb-1 block">{t("deposit.enable")}</label>
            <div className="flex gap-2">
              <select
                value={editDepositType}
                onChange={(e) => setEditDepositType(e.target.value)}
                aria-label={t("deposit.typeFixed")}
                className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 w-32"
              >
                <option value="percent">{t("deposit.typePercent")}</option>
                <option value="fixed">{t("deposit.typeFixed")}</option>
              </select>
              <input
                type="number"
                min="0"
                step={editDepositType === "percent" ? "1" : "0.01"}
                max={editDepositType === "percent" ? "100" : undefined}
                value={editDepositValue}
                onChange={(e) => setEditDepositValue(e.target.value)}
                placeholder={editDepositType === "percent" ? "%" : "$"}
                className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
          </div>

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
            <Button size="sm" className="bg-green-700 hover:bg-green-800 text-white" onClick={save} disabled={saving}>
              {saving ? t("customizeBooking.saving") : t("common.save")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={saving}>{t("common.cancel")}</Button>
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
          {!isHourly && booking.custom_price != null && (
            <p className="text-sm text-gray-700">
              {t("customizeBooking.customPriceValue")}{" "}
              <span className="font-semibold text-green-700">${Number(booking.custom_price)}</span>
            </p>
          )}
          {booking.worker_note && <p className="text-sm text-gray-600 whitespace-pre-line">{booking.worker_note}</p>}
          {!booking.custom_price && !booking.worker_note && !booking.estimated_hours && (
            <p className="text-xs text-gray-400 italic">{t("customizeBooking.empty")}</p>
          )}
        </>
      )}
    </div>
  );
}
