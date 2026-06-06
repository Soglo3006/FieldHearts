"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { getEmailValidationIssue } from "@/lib/emailValidation";
import { SocialOAuthButtons } from "@/components/auth/SocialOAuthButtons";

type LoginPromptFormProps = {
  redirectTo?: string;
  formIdPrefix?: string;
};

export function LoginPromptForm({
  redirectTo,
  formIdPrefix = "auth-gate",
}: LoginPromptFormProps) {
  const { t } = useTranslation();
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const emailId = `${formIdPrefix}-email`;
  const passwordId = `${formIdPrefix}-password`;

  const registerHref = redirectTo
    ? `/register?redirect=${encodeURIComponent(redirectTo)}`
    : "/register";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPasswordError("");

    const emailIssue = getEmailValidationIssue(email);
    if (emailIssue === "empty") {
      setEmailError(t("login.emailRequired"));
      return;
    }
    if (emailIssue === "invalid") {
      setEmailError(t("login.emailInvalid"));
      return;
    }
    setEmailError("");

    if (!password.trim()) {
      setPasswordError(t("login.passwordRequired"));
      return;
    }

    setLoggingIn(true);
    try {
      await signInWithEmail(email, password, { redirectTo, stayOnPage: true });
      setLoggingIn(false);
    } catch (err: unknown) {
      setLoggingIn(false);
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("Email not confirmed")) {
        setEmailNotConfirmed(true);
        setError(t("login.emailNotConfirmed"));
      } else {
        setEmailNotConfirmed(false);
        setError(t("login.loginFailed"));
      }
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleLogin} noValidate className="space-y-3">
        {error ? (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
            {emailNotConfirmed ? (
              <Link
                href={`/auth/verify-email?email=${encodeURIComponent(email)}`}
                className="mt-2 block font-medium text-green-700 underline"
              >
                {t("auth.resendEmail")}
              </Link>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Input
            id={emailId}
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError("");
            }}
            placeholder={t("login.email")}
            autoComplete="email"
            autoFocus
            aria-invalid={Boolean(emailError)}
            className={emailError ? "border-red-500 focus-visible:ring-red-300" : undefined}
          />
          {emailError ? <p className="text-xs text-red-600">{emailError}</p> : null}
        </div>

        <div className="space-y-1.5">
          <div className="relative">
            <Input
              id={passwordId}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError("");
              }}
              placeholder={t("login.password")}
              autoComplete="current-password"
              aria-invalid={Boolean(passwordError)}
              className={passwordError ? "border-red-500 pr-10 focus-visible:ring-red-300" : "pr-10"}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {passwordError ? <p className="text-xs text-red-600">{passwordError}</p> : null}
        </div>

        <Button
          type="submit"
          className="h-11 w-full cursor-pointer bg-green-800 hover:bg-green-900"
          disabled={loggingIn}
          aria-busy={loggingIn}
        >
          {loggingIn ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : t("login.loginButton")}
        </Button>
      </form>

      <div className="text-center">
        <Link href="/forgot-password" className="text-sm font-medium text-green-700 hover:underline">
          {t("login.forgotPassword")}
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-sm text-gray-500">{t("login.orContinueWith")}</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <SocialOAuthButtons
        fullWidth
        googleLabel={t("login.loginWithGoogle")}
        facebookLabel={t("login.loginWithFacebook")}
        redirectTo={redirectTo}
      />

      <Link href={registerHref} className="block">
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full cursor-pointer border-green-700 text-green-800 hover:bg-green-50"
        >
          {t("login.createAccount")}
        </Button>
      </Link>
    </div>
  );
}
