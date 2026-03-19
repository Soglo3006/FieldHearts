"use client";
import { Button } from "@/components/ui/button";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import React, { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { FcGoogle } from "react-icons/fc";
import { FaFacebookF } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { Spinner } from "@/components/ui/Spinner";

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [chargement, setChargement] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const { signUpWithEmail, signInWithGoogle, signInWithFacebook } = useAuth();
  const router = useRouter();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) setEmail(decodeURIComponent(emailParam));
  }, [searchParams]);

  const { loading } = useProtectedRoute({
    requireAuth: false,
  });

  if (loading) return (
    <div className="min-h-screen flex flex-col bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="xl" />
        </div>
      </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("register.passwordsMismatch"));
      return;
    }

    if (password.length < 6) {
      setError(t("register.passwordTooShort"));
      return;
    }

    setChargement(true);

    try {
      await signUpWithEmail(email, password, fullName);
      setShowSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("register.registrationFailed"));
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="absolute top-4 right-4 flex items-center gap-1 bg-white border border-gray-200 rounded-full px-1 py-1 shadow-sm">
        <button
          type="button"
          onClick={() => i18n.changeLanguage("fr")}
          className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${i18n.language === "fr" ? "bg-green-700 text-white" : "text-gray-500 hover:text-gray-800"}`}
        >
          FR
        </button>
        <button
          type="button"
          onClick={() => i18n.changeLanguage("en")}
          className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${i18n.language === "en" ? "bg-green-700 text-white" : "text-gray-500 hover:text-gray-800"}`}
        >
          EN
        </button>
      </div>
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="text-4xl mb-4">✉️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t("register.accountCreated")}</h2>
            <p className="text-gray-600 text-sm mb-6">
              {t("register.checkEmail")}
            </p>
            <Button
              className="w-full bg-green-800 hover:bg-green-900"
              onClick={() => router.push("/auth/verify-email")}
            >
              {t("register.ok")}
            </Button>
          </div>
        </div>
      )}
      {/* Logo above card */}
      <Link href="/" className="mb-6 text-3xl font-bold text-green-700 hover:text-green-800 transition-colors">
        Uneden
      </Link>

      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">{t("register.title")}</CardTitle>
          <CardDescription className="font-semibold text-xs">
            {t("register.subtitle")}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6 font-semibold text-sm">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="full_name">{t("register.fullName")}</Label>
                <Input
                  id="full_name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">{t("register.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">{t("register.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm_password">{t("register.confirmPassword")}</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-green-800 hover:bg-green-900 cursor-pointer"
                disabled={chargement}
              >
                {chargement ? t("register.creatingAccount") : t("register.createAccount")}
              </Button>
            </div>
          </form>
          <div className="flex items-center my-3">
              <div className="flex-1 h-px bg-gray-400" />
              <span className="px-4 text-sm">
                {t("register.orContinueWith")}
              </span>
              <div className="flex-1 h-px bg-gray-400" />
            </div>
            <div className="flex flex-col gap-2">
<Button variant="outline" type="button" className="cursor-pointer" onClick={() => signInWithGoogle()}>
              <FcGoogle />
              {t("register.signInWithGoogle")}
            </Button>
            <Button variant="outline" type="button" className="cursor-pointer" onClick={() => signInWithFacebook()}>
              <FaFacebookF className="text-blue-600 h-5 w-5"/>
              {t("register.signInWithFacebook")}
            </Button>
            </div>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <CardDescription className="font-semibold text-xs text-center justify-center">
            {t("register.terms")}
          </CardDescription>
        </CardFooter>
      </Card>
      <p className="mt-4 text-sm text-gray-600">
        {t("register.alreadyHaveAccount")}{" "}
        <Link href="/login" className="text-green-600 hover:underline">
          {t("register.signIn")}
        </Link>
      </p>

      {/* Footer links */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400">
        <Link href="/privacy" className="hover:text-gray-600 hover:underline">{t("footer.privacyPolicy")}</Link>
        <span>·</span>
        <Link href="/terms" className="hover:text-gray-600 hover:underline">{t("footer.termsOfUse")}</Link>
        <span>·</span>
        <span className="text-gray-300 cursor-default">Aide</span>
      </div>
      <p className="mt-3 text-xs text-gray-400">{t("footer.rights", { year: new Date().getFullYear() })}</p>
    </div>
    </div>
  )
}
