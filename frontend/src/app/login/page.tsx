"use client";
import { Button } from "@/components/ui/button";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";
import { FaFacebookF } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

type Step = "email" | "password" | "not-found";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const { signInWithEmail, signInWithGoogle, signInWithFacebook } = useAuth();
  const { t } = useTranslation();
  const { loading } = useProtectedRoute({ requireAuth: false });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Spinner size="xl" />
    </div>
  );

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError("");
    setCheckingEmail(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/check-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.exists) {
        setStep("password");
      } else {
        setStep("not-found");
      }
    } catch {
      // Fallback: go to password step anyway
      setStep("password");
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoggingIn(true);
    try {
      await signInWithEmail(email, password);
    } catch (err: unknown) {
      setLoggingIn(false);
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("Email not confirmed")) {
        setError(t("login.emailNotConfirmed"));
      } else {
        setError(t("login.loginFailed"));
      }
    }
  };

  const resetToEmail = () => {
    setStep("email");
    setError("");
    setPassword("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex-1 flex flex-col items-center justify-center p-4">

        {/* Logo */}
        <Link href="/" className="mb-6 text-3xl font-bold text-green-700 hover:text-green-800 transition-colors">
          Uneden
        </Link>

        <Card className="w-full max-w-sm">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold">
              {step === "not-found" ? (t("login.noAccountFound") || "Compte introuvable") : t("login.title")}
            </CardTitle>
            <CardDescription className="text-xs font-semibold">
              {step === "not-found"
                ? (t("login.noAccountFoundSubtitle") || "Aucun compte trouvé avec cette adresse courriel.")
                : t("login.subtitle")}
            </CardDescription>
          </CardHeader>

          <CardContent>

            {/* ── STEP: email ── */}
            {step === "email" && (
              <>
                <form onSubmit={handleCheckEmail}>
                  <div className="flex flex-col gap-5">
                    {error && <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>}
                    <div className="grid gap-2">
                      <Label htmlFor="email" className="font-semibold text-sm">{t("login.email")}</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        autoFocus
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full bg-green-800 hover:bg-green-900 cursor-pointer" disabled={checkingEmail}>
                      {checkingEmail
                        ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t("login.checking") || "Vérification..."}</>
                        : (t("login.continue") || "Continuer")}
                    </Button>
                  </div>
                </form>

                <div className="flex items-center my-4">
                  <div className="flex-1 h-px bg-gray-300" />
                  <span className="px-4 text-sm text-gray-500">{t("login.orContinueWith")}</span>
                  <div className="flex-1 h-px bg-gray-300" />
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" type="button" className="cursor-pointer w-full" onClick={() => signInWithGoogle()}>
                    <FcGoogle /> {t("login.loginWithGoogle")}
                  </Button>
                  <Button variant="outline" type="button" className="cursor-pointer w-full" onClick={() => signInWithFacebook()}>
                    <FaFacebookF className="text-blue-600 h-5 w-5" /> {t("login.loginWithFacebook")}
                  </Button>
                </div>

                <p className="text-center text-xs text-gray-500 mt-5">
                  {t("login.noAccount")}{" "}
                  <Link href="/register" className="text-green-600 hover:underline">{t("login.signUp")}</Link>
                </p>
              </>
            )}

            {/* ── STEP: password ── */}
            {step === "password" && (
              <form onSubmit={handleLogin}>
                <div className="flex flex-col gap-5">
                  {error && <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>}

                  {/* Email confirmé (read-only) */}
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <span className="flex-1 truncate">{email}</span>
                    <button
                      type="button"
                      onClick={resetToEmail}
                      className="text-green-700 hover:text-green-800 flex items-center gap-1 shrink-0"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      <span className="text-xs">{t("login.change") || "Modifier"}</span>
                    </button>
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="password" className="font-semibold text-sm">{t("login.password")}</Label>
                      <Link href="/forgot-password" className="ml-auto text-sm hover:underline text-green-700">
                        {t("login.forgotPassword")}
                      </Link>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      autoFocus
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full bg-green-800 hover:bg-green-900 cursor-pointer" disabled={loggingIn}>
                    {loggingIn
                      ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t("login.loading")}</>
                      : t("login.loginButton")}
                  </Button>
                </div>
              </form>
            )}

            {/* ── STEP: not-found ── */}
            {step === "not-found" && (
              <div className="flex flex-col gap-4">
                {/* Email affiché */}
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <span className="flex-1 truncate">{email}</span>
                  <button
                    type="button"
                    onClick={resetToEmail}
                    className="text-green-700 hover:text-green-800 flex items-center gap-1 shrink-0"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    <span className="text-xs">{t("login.change") || "Modifier"}</span>
                  </button>
                </div>

                <p className="text-sm text-gray-600 text-center">
                  {t("login.wantToCreate") || "Voulez-vous créer un compte avec cette adresse ?"}
                </p>

                <Link href={`/register?email=${encodeURIComponent(email)}`} className="w-full">
                  <Button className="w-full bg-green-800 hover:bg-green-900 cursor-pointer">
                    {t("login.createAccount") || "Créer un compte"}
                  </Button>
                </Link>

                <Button variant="outline" className="w-full cursor-pointer" onClick={resetToEmail}>
                  {t("login.tryAnotherEmail") || "Essayer une autre adresse"}
                </Button>
              </div>
            )}

          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400">
          <Link href="/privacy" className="hover:text-gray-600 hover:underline">
            {t("footer.privacyPolicy")}
          </Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-gray-600 hover:underline">
            {t("footer.termsOfUse")}
          </Link>
          <span>·</span>
          <span className="text-gray-300 cursor-default">Aide</span>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          {t("footer.rights", { year: new Date().getFullYear() })}
        </p>
      </div>
    </div>
  );
}
