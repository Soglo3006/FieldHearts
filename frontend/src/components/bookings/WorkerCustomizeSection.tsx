"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Booking {
  id: string;
  status: string;
  worker_note?: string | null;
  custom_price?: number | null;
  price: string | number;
}

interface Props {
  booking: Booking;
  accessToken: string;
  onSaved: (data: Record<string, unknown>) => void;
}

export default function WorkerCustomizeSection({ booking, accessToken, onSaved }: Props) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [editNote, setEditNote] = useState(booking.worker_note ?? "");
  const [editPrice, setEditPrice] = useState(String(booking.custom_price ?? booking.price ?? ""));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${booking.id}/customize`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ worker_note: editNote, custom_price: Number(editPrice) }),
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
          <button onClick={() => setEditing(true)} className="text-xs text-green-700 hover:underline flex items-center gap-1">
            <Pencil className="h-3 w-3" /> {t("common.edit")}
          </button>
        )}
      </div>
      {editing ? (
        <>
          <div>
            <label htmlFor="customizeBookingPrice" className="text-xs text-gray-500 mb-1 block">{t("customizeBooking.customPriceLabel")}</label>
            <input
              id="customizeBookingPrice"
              type="number" min="0" step="0.01" value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>
          <div>
            <label htmlFor="customizeBookingNote" className="text-xs text-gray-500 mb-1 block">{t("customizeBooking.noteLabel")}</label>
            <textarea
              id="customizeBookingNote"
              value={editNote} onChange={(e) => setEditNote(e.target.value)} rows={3}
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
          {booking.custom_price && <p className="text-sm text-gray-700">{t("customizeBooking.customPriceValue")} <span className="font-semibold text-green-700">${Number(booking.custom_price)}</span></p>}
          {booking.worker_note && <p className="text-sm text-gray-600 whitespace-pre-line">{booking.worker_note}</p>}
          {!booking.custom_price && !booking.worker_note && (
            <p className="text-xs text-gray-400 italic">{t("customizeBooking.empty")}</p>
          )}
        </>
      )}
    </div>
  );
}
