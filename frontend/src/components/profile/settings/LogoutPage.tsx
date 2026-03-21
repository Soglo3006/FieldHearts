"use client";
import { useState } from "react";
import { ArrowLeft, X, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { Spinner } from "@/components/ui/Spinner";

interface Props {
  onBack: () => void;
  onClose: () => void;
}

export default function LogoutPage({ onBack, onClose }: Props) {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setLoading(true);
      await signOut();
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

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

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-6 py-12 space-y-8">

          {/* Icon + Title */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100">
              <LogOut className="h-6 w-6 text-gray-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{t("settings.logout")}</h2>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">{t("settings.logoutConfirm")}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loading}
              className="w-full h-11 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Spinner size="xs" />
                  {t("settings.loggingOut")}
                </>
              ) : (
                t("settings.logoutButton")
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
          </div>

        </div>
      </div>
    </div>
  );
}
