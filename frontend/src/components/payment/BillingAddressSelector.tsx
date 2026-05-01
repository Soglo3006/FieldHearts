"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PROVINCES, normalizeProvince } from "@/lib/taxes";
import AddressAutocomplete from "@/components/ui/AddressAutocomplete";

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
  onUpdate: (id: string, data: Omit<BillingAddress, "id" | "is_default">) => Promise<void>;
  onSetDefault: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  accessToken: string;
}

const MAX_ADDRESSES = 2;
const SYSTEM_DEFAULT_BILLING_LABELS = new Set(["Domicile", "Home"]);

export default function BillingAddressSelector({ addresses, selectedId, onSelect, onAdd, onUpdate, onSetDefault, onDelete }: Props) {
  const { t, i18n } = useTranslation();
  const isFr = i18n.language?.startsWith("fr");
  const defaultBillingLabel = t("payment.defaultBillingLabel");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [settingDefault, setSettingDefault] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    label: "",
    full_name: "",
    address_line1: "",
    city: "",
    province: "QC",
    postal_code: "",
  });

  const resetForm = () => {
    setForm({ label: "", full_name: "", address_line1: "", city: "", province: "QC", postal_code: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.address_line1 || !form.city || !form.province || !form.postal_code) return;
    setSaving(true);
    try {
      const payload = {
        label: form.label || defaultBillingLabel,
        full_name: form.full_name || null,
        address_line1: form.address_line1,
        city: form.city,
        province: form.province,
        postal_code: form.postal_code,
      };

      if (editingId) {
        await onUpdate(editingId, payload);
      } else {
        await onAdd(payload);
      }

      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (address: BillingAddress) => {
    onSelect(address);
    setEditingId(address.id);
    setForm({
      label: SYSTEM_DEFAULT_BILLING_LABELS.has(address.label) ? defaultBillingLabel : address.label,
      full_name: address.full_name ?? "",
      address_line1: address.address_line1,
      city: address.city,
      province: address.province,
      postal_code: address.postal_code,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await onDelete(id);
    } finally {
      setDeleting(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    setSettingDefault(id);
    try {
      await onSetDefault(id);
    } finally {
      setSettingDefault(null);
    }
  };

  const orderedAddresses = [...addresses].sort((left, right) => Number(right.is_default) - Number(left.is_default));
  const getDisplayLabel = (label: string) => SYSTEM_DEFAULT_BILLING_LABELS.has(label) ? defaultBillingLabel : label;

  const renderForm = () => (
    <div className="mt-3 border border-gray-200 rounded-xl p-4 bg-white space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">{t("payment.billingAddressLabel")}</label>
          <input
            title={t("payment.billingAddressLabel")}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
            value={form.label}
            placeholder={defaultBillingLabel}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">{t("payment.billingAddressLine1")} *</label>
          <AddressAutocomplete
            value={form.address_line1}
            onChange={(raw) => setForm((f) => ({ ...f, address_line1: raw }))}
            onSelect={(result) => setForm((f) => ({
              ...f,
              address_line1: result.adresse || result.fullAddress,
              city: result.ville || f.city,
              province: normalizeProvince(result.province) || f.province,
              postal_code: result.postalCode || f.postal_code,
            }))}
            placeholder={t("payment.billingAddressStreetPlaceholder")}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t("payment.billingAddressCity")} *</label>
          <input
            title={t("payment.billingAddressCity")}
            placeholder={t("payment.billingAddressCityPlaceholder")}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t("payment.billingAddressPostal")} *</label>
          <input
            title={t("payment.billingAddressPostal")}
            placeholder="A1A 1A1"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
            value={form.postal_code}
            onChange={(e) => setForm((f) => ({ ...f, postal_code: e.target.value.toUpperCase() }))}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">{t("payment.billingAddressProvince")} *</label>
          <select
            title={t("payment.billingAddressProvince")}
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
        <Button type="button" size="sm" variant="outline" onClick={resetForm}>
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
  );

  return (
    <div>
      <div className="mb-3">
        <span className="font-semibold text-gray-800 text-sm">{t("payment.billingAddress")}</span>
      </div>
      <p className="text-xs text-gray-500 mb-3">{t("payment.billingAddressDesc")}</p>

      <div className="space-y-2 mb-3">
        {orderedAddresses.map((addr) => {
          const selected = addr.id === selectedId;
          const isEditing = editingId === addr.id;
          return (
            <div
              key={addr.id}
              onClick={() => {
                if (!isEditing) onSelect(addr);
              }}
              className={`rounded-xl border px-4 py-3 transition-all ${
                selected
                  ? "border-green-600 bg-green-50 ring-1 ring-green-600"
                  : "border-gray-200 hover:border-green-300 bg-white"
              } ${isEditing ? "cursor-default" : "cursor-pointer"}`}
            >
              {isEditing ? (
                <div onClick={(e) => e.stopPropagation()}>
                  {renderForm()}
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selected ? "border-green-600 bg-green-600" : "border-gray-300"
                    }`}>
                      {selected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-gray-700">{getDisplayLabel(addr.label)}</span>
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
                  <div className="flex shrink-0 items-start gap-2 mt-0.5">
                    {!addr.is_default && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetDefault(addr.id);
                        }}
                        disabled={settingDefault === addr.id}
                        className="text-[11px] font-medium text-gray-500 hover:text-green-700 transition-colors disabled:opacity-50"
                      >
                        {settingDefault === addr.id ? "…" : t("payment.setDefaultBillingAddress")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(addr);
                      }}
                      className="text-[11px] font-medium text-gray-500 hover:text-green-700 transition-colors"
                    >
                      {t("payment.editBillingAddress")}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDelete(addr.id); }}
                      disabled={deleting === addr.id}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                      aria-label={t("payment.deleteBillingAddress")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
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

      {showForm && !editingId && renderForm()}
    </div>
  );
}
