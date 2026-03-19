"use client";
import { useState } from "react";
import { ArrowLeft, X, KeyRound, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { Spinner } from "@/components/ui/Spinner";

interface Props {
  onBack: () => void;
  onClose: () => void;
}

export default function ChangePasswordPage({ onBack, onClose }: Props) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [errors, setErrors] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });

  const validateForm = () => {
    const newErrors = { oldPassword: "", newPassword: "", confirmPassword: "" };
    if (!formData.oldPassword) newErrors.oldPassword = t("settings.passwordRequired");
    if (!formData.newPassword) newErrors.newPassword = t("settings.newPasswordRequired");
    else if (formData.newPassword.length < 8) newErrors.newPassword = t("settings.newPasswordMinLength");
    if (!formData.confirmPassword) newErrors.confirmPassword = t("settings.confirmPasswordRequired");
    else if (formData.newPassword !== formData.confirmPassword) newErrors.confirmPassword = t("settings.passwordsMismatch");
    if (formData.oldPassword && formData.oldPassword === formData.newPassword) newErrors.newPassword = t("settings.passwordSameAsCurrent");
    setErrors(newErrors);
    return !Object.values(newErrors).some(e => e !== "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(false);
    if (!validateForm()) return;
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/change-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ oldPassword: formData.oldPassword, newPassword: formData.newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || t("settings.passwordError"));
      setSuccess(true);
      setFormData({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => onBack(), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("settings.passwordError"));
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
        <div className="max-w-md mx-auto px-6 py-10 space-y-8">

          {/* Icon + Title */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-50">
              <KeyRound className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{t("settings.changePassword")}</h2>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">{t("settings.updatePassword")}</p>
            </div>
          </div>

          {/* Success state */}
          {success && (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-xl">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              <p className="text-sm text-green-800">{t("settings.passwordUpdated")}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5 pb-6">
            <div className="space-y-1.5">
              <Label htmlFor="oldPassword" className="text-sm font-medium text-gray-700">
                {t("settings.currentPassword")}
              </Label>
              <Input
                id="oldPassword"
                type="password"
                value={formData.oldPassword}
                onChange={(e) => { setFormData({ ...formData, oldPassword: e.target.value }); setErrors({ ...errors, oldPassword: "" }); }}
                className={`h-11 ${errors.oldPassword ? "border-red-400 focus-visible:ring-red-300" : ""}`}
                disabled={loading}
                autoComplete="current-password"
              />
              {errors.oldPassword && <p className="text-xs text-red-500">{errors.oldPassword}</p>}
            </div>

            <div className="h-px bg-gray-100" />

            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                {t("settings.newPassword")}
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={(e) => { setFormData({ ...formData, newPassword: e.target.value }); setErrors({ ...errors, newPassword: "" }); }}
                className={`h-11 ${errors.newPassword ? "border-red-400 focus-visible:ring-red-300" : ""}`}
                disabled={loading}
                autoComplete="new-password"
              />
              {errors.newPassword
                ? <p className="text-xs text-red-500">{errors.newPassword}</p>
                : <p className="text-xs text-gray-400">{t("settings.passwordMinLength")}</p>
              }
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                {t("settings.confirmPassword")}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => { setFormData({ ...formData, confirmPassword: e.target.value }); setErrors({ ...errors, confirmPassword: "" }); }}
                className={`h-11 ${errors.confirmPassword ? "border-red-400 focus-visible:ring-red-300" : ""}`}
                disabled={loading}
                autoComplete="new-password"
              />
              {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg text-sm font-medium bg-green-700 hover:bg-green-800 text-white transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
            >
              {loading ? (
                <>
                  <Spinner size="xs" />
                  {t("settings.updating")}
                </>
              ) : (
                t("settings.updatePassword")
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
