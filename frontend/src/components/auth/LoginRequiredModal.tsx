"use client";

import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useScrollLock } from "@/hooks/useScrollLock";
import { LoginPromptForm } from "@/components/auth/LoginPromptForm";
import { resolveAuthGateContext, type AuthGateOptions } from "@/lib/loginRedirectContext";

type LoginRequiredModalProps = {
  open: boolean;
  onClose: () => void;
  options: AuthGateOptions | null;
};

export function LoginRequiredModal({ open, onClose, options }: LoginRequiredModalProps) {
  const { t } = useTranslation();
  useScrollLock(open);

  if (!open || !options) return null;

  const context = resolveAuthGateContext(options);
  const title =
    context === "default" ? t("login.title") : t(`login.context.${context}.title`);
  const subtitle =
    context === "default" ? t("login.subtitle") : t(`login.context.${context}.subtitle`);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-required-title"
        className="relative w-full max-w-[400px] rounded-xl bg-white p-5 shadow-xl animate-in fade-in zoom-in-95 duration-200 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
          aria-label={t("serviceDetail.close")}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="pr-8 text-center">
          <h2 id="login-required-title" className="text-xl font-bold text-gray-900 sm:text-2xl">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{subtitle}</p>
        </div>

        <div className="mt-5">
          <LoginPromptForm redirectTo={options.redirect} formIdPrefix="login-required" />
        </div>
      </div>
    </div>
  );
}
