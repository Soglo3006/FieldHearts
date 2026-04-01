"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Plus, Trash2, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PROVINCES } from "@/lib/taxes";

export interface BillingAddress {
  id: string;
  label: string;
  full_name: string | null;
  address_line1: string;
  city: string;
  province: string;
  postal_code: string;
  is_default: boolean;
}

interface Props {
  addresses: BillingAddress[];
  selectedId: string | null;
  onSelect: (address: BillingAddress) => void;
  onAdd: (data: Omit<BillingAddress, "id" | "is_default">) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  accessToken: string;
}

const MAX_ADDRESSES = 2;

export default function BillingAddressSelector({ addresses, selectedId, onSelect, onAdd, onDelete }: Props) {
  const { t, i18n } = useTranslation();
  const isFr = i18n.language?.startsWith("fr");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({
    label: "",
    full_name: "",
    address_line1: "",
    city: "",
    province: "QC",
    postal_code: "",
  });

  const handleSave = async () => {
    if (!form.address_line1 || !form.city || !form.province || !form.postal_code) return;
    setSaving(true);
    try {
      await onAdd({
        label: form.label || (isFr ? "Domicile" : "Home"),
        full_name: form.full_name || null,
        address_line1: form.address_line1,
        city: form.city,
        province: form.province,
        postal_code: form.postal_code,
      });
      setForm({ label: "", full_name: "", address_line1: "", city: "", province: "QC", postal_code: "" });
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await onDelete(id);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="h-4 w-4 text-green-700" />
        <span className="font-semibold text-gray-800 text-sm">{t("payment.billingAddress")}</span>
      </div>
      <p className="text-xs text-gray-500 mb-3">{t("payment.billingAddressDesc")}</p>

      <div className="space-y-2 mb-3">
        {addresses.map((addr) => {
          const selected = addr.id === selectedId;
          return (
            <div
              key={addr.id}
              onClick={() => onSelect(addr)}
              className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all ${
                selected
                  ? "border-green-600 bg-green-50 ring-1 ring-green-600"
                  : "border-gray-200 hover:border-green-300 bg-white"
              }`}
            >
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  selected ? "border-green-600 bg-green-600" : "border-gray-300"
                }`}>
                  {selected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-gray-700">{addr.label}</span>
                    {addr.is_default && (
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full border border-gray-200">
                        {t("payment.billingAddressDefault")}
                      </span>
                    )}
                  </div>
                  {addr.full_name && <p className="text-xs text-gray-600">{addr.full_name}</p>}
                  <p className="text-xs text-gray-600">{addr.address_line1}</p>
                  <p className="text-xs text-gray-600">{addr.city}, {addr.province} {addr.postal_code}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDelete(addr.id); }}
                disabled={deleting === addr.id}
                className="text-gray-300 hover:text-red-500 transition-colors shrink-0 mt-0.5"
                aria-label={t("payment.deleteBillingAddress")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {addresses.length < MAX_ADDRESSES && !showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-xs text-green-700 hover:text-green-800 font-medium"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("payment.addBillingAddress")}
        </button>
      )}

      {addresses.length >= MAX_ADDRESSES && !showForm && (
        <p className="text-xs text-gray-400 italic">{t("payment.billingAddressMaxReached")}</p>
      )}

      {showForm && (
        <div className="mt-3 border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">{t("payment.billingAddressLabel")}</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                value={form.label}
                placeholder={isFr ? "Domicile" : "Home"}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">{t("payment.billingAddressLine1")} *</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                value={form.address_line1}
                onChange={(e) => setForm((f) => ({ ...f, address_line1: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t("payment.billingAddressCity")} *</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t("payment.billingAddressPostal")} *</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                value={form.postal_code}
                onChange={(e) => setForm((f) => ({ ...f, postal_code: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">{t("payment.billingAddressProvince")} *</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                value={form.province}
                onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
              >
                {PROVINCES.map((p) => (
                  <option key={p.code} value={p.code}>
                    {isFr ? p.nameFR : p.nameEN} ({p.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>
              {t("payment.billingAddressCancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-green-700 hover:bg-green-800 text-white"
              onClick={handleSave}
              disabled={saving || !form.address_line1 || !form.city || !form.postal_code}
            >
              {saving ? "…" : t("payment.billingAddressSave")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
