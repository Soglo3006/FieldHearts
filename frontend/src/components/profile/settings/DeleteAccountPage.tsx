"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ArrowLeft, X, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { Spinner } from "@/components/ui/Spinner";

interface Props {
  onBack: () => void;
  onClose: () => void;
}

const CONFIRM_WORD = "SUPPRIMER";

export default function DeleteAccountPage({ onBack, onClose }: Props) {
  const { t } = useTranslation();
  const { session, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmText, setConfirmText] = useState("");

  const isConfirmed = confirmText === CONFIRM_WORD;

  const handleDelete = async () => {
    if (!isConfirmed) return;
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/delete-account`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || t("settings.deleteWarning"));
      await signOut();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("settings.deleteWarning"));
    } finally {
      setLoading(false);
    }
  };

  const items = [
    t("settings.deleteItemProfile"),
    t("settings.deleteItemMessages"),
    t("settings.deleteItemServices"),
    t("settings.deleteItemBookings"),
    t("settings.deleteItemReviews"),
  ];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("settings.back", "Retour")}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-6 py-10 space-y-8">

          {/* Icon + Title */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-50">
              <ShieldAlert className="h-7 w-7 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{t("settings.permanentDeletion")}</h2>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">{t("settings.permanentWarning")}</p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100" />

          {/* What gets deleted */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
              {t("settings.dataToBeDeleted", "Ce qui sera supprimé")}
            </p>
            {items.map((item) => (
              <div key={item} className="flex items-center gap-3 py-2 border-b border-gray-50">
                <span className="h-1.5 w-1.5 rounded-full bg-red-300 shrink-0" />
                <span className="text-sm text-gray-600">{item}</span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100" />

          {/* Confirm input */}
          <div className="space-y-3">
            <p className="text-sm text-gray-600 text-center leading-relaxed">
              {t("settings.typeToConfirm", "Tapez")}{" "}
              <span className="font-mono font-semibold text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                {CONFIRM_WORD}
              </span>{" "}
              {t("settings.toConfirmAction", "pour confirmer la suppression")}
            </p>
            <Input
              type="text"
              value={confirmText}
              onChange={(e) => { setConfirmText(e.target.value.toUpperCase()); setError(""); }}
              placeholder={CONFIRM_WORD}
              disabled={loading}
              autoComplete="off"
              spellCheck={false}
              className="text-center font-mono tracking-widest text-sm h-11 placeholder:text-gray-300 placeholder:tracking-widest"
            />
            {error && (
              <p className="text-xs text-red-500 text-center">{error}</p>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2.5 pb-6">
            <button
              type="button"
              onClick={handleDelete}
              disabled={!isConfirmed || loading}
              className={`w-full h-11 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                isConfirmed && !loading
                  ? "bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-sm"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              {loading ? (
                <>
                  <Spinner size="xs" />
                  {t("settings.deleting")}
                </>
              ) : (
                t("settings.deleteConfirm")
              )}
            </button>
            <button
              type="button"
              onClick={onBack}
              disabled={loading}
              className="w-full h-11 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              {t("settings.cancel")}
            </button>
            <p className="text-xs text-gray-400 text-center pt-1">{t("settings.cannotBeUndone")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
