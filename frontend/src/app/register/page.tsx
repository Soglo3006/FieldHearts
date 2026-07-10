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
import { Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react";
import { useScrollLock } from "@/hooks/useScrollLock"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { SocialOAuthButtons } from "@/components/auth/SocialOAuthButtons";
import AuthPageSkeleton from "@/components/auth/AuthPageSkeleton";
import { useTranslation } from "react-i18next";
import { getLanguageCode } from "@/lib/locale";
import { getEmailValidationIssue } from "@/lib/emailValidation";

type Step = "email" | "password";

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [step, setStep] = useState<Step>("email")
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [chargement, setChargement] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  useScrollLock(showSuccess)

  const { signUpWithEmail } = useAuth();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const selectedLanguage = getLanguageCode(i18n.language);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
      setStep("password");
    }
  }, [searchParams]);

  const { loading } = useProtectedRoute({
    requireAuth: false,
  });


  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const issue = getEmailValidationIssue(email);
    if (issue === "empty") {
      setEmailError(t("register.emailRequired"));
      return;
    }
    if (issue === "invalid") {
      setEmailError(t("register.emailInvalid"));
      return;
    }
    setEmailError("");
    setError("");
    setCheckingEmail(true);
    try {
      const checkRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/check-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (checkRes.ok) {
        const { exists } = await checkRes.json();
        if (exists) {
          setError(t("register.emailAlreadyExists"));
          return;
        }
      }
      setStep("password");
    } catch {
      setStep("password");
    } finally {
      setCheckingEmail(false);
    }
  };

  const isPasswordStepComplete =
    Boolean(firstName.trim()) &&
    Boolean(lastName.trim()) &&
    password.length >= 8 &&
    Boolean(confirmPassword.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!firstName.trim() || !lastName.trim()) {
      setError(t("register.nameRequired"));
      return;
    }

    if (!password.trim()) {
      setError(t("register.passwordRequired"));
      return;
    }

    if (password.length < 8) {
      setError(t("register.passwordTooShort"));
      return;
    }

    if (!confirmPassword.trim()) {
      setError(t("register.confirmPasswordRequired"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("register.passwordsMismatch"));
      return;
    }

    setChargement(true);

    try {
      await signUpWithEmail(email, password, firstName.trim(), lastName.trim());
      setShowSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("register.registrationFailed"));
    } finally {
      setChargement(false);
    }
  };

  const resetToEmail = () => {
    setStep("email");
    setError("");
    setEmailError("");
    setPassword("");
    setConfirmPassword("");
    setFirstName("");
    setLastName("");
  };

  if (loading) return <AuthPageSkeleton />;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="absolute top-4 right-4 flex items-center gap-1 bg-white border border-gray-200 rounded-full px-1 py-1 shadow-sm">
        <button
          type="button"
          onClick={() => { i18n.changeLanguage("fr"); localStorage.setItem("i18nextLng", "fr"); }}
          className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${selectedLanguage === "fr" ? "bg-green-700 text-white" : "text-gray-500 hover:text-gray-800"}`}
        >
          FR
        </button>
        <button
          type="button"
          onClick={() => { i18n.changeLanguage("en"); localStorage.setItem("i18nextLng", "en"); }}
          className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${selectedLanguage === "en" ? "bg-green-700 text-white" : "text-gray-500 hover:text-gray-800"}`}
        >
          EN
        </button>
      </div>
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4 text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t("register.accountCreated")}</h2>
            <p className="text-gray-600 text-sm mb-6">
              {t("register.checkEmail")}
            </p>
            <Button
              className="w-full bg-green-800 hover:bg-green-900"
              onClick={() => router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`)}
            >
              {t("register.ok")}
            </Button>
          </div>
        </div>
      )}
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
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4">
              {error}
            </div>
          )}

          {step === "email" && (
            <>
              <form onSubmit={handleCheckEmail} noValidate>
                <div className="flex flex-col gap-6 font-semibold text-sm">
                  <div className="grid gap-2">
                    <Label htmlFor="email">{t("register.email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError("");
                      }}
                      autoComplete="email"
                      autoFocus
                      aria-invalid={Boolean(emailError)}
                      aria-describedby={emailError ? "register-email-error" : undefined}
                      className={emailError ? "border-red-500 focus-visible:ring-red-300" : undefined}
                    />
                    {emailError ? (
                      <p id="register-email-error" className="text-xs font-normal text-red-600">
                        {emailError}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="submit"
                    className="flex w-full items-center justify-center bg-green-800 hover:bg-green-900 cursor-pointer"
                    disabled={checkingEmail}
                  >
                    {checkingEmail ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      t("register.continue")
                    )}
                  </Button>
                </div>
              </form>
              <div className="flex items-center my-3">
                <div className="flex-1 h-px bg-gray-400" />
                <span className="px-4 text-sm">{t("register.orContinueWith")}</span>
                <div className="flex-1 h-px bg-gray-400" />
              </div>
              <SocialOAuthButtons
                googleLabel={t("register.signInWithGoogle")}
                facebookLabel={t("register.signInWithFacebook")}
              />
            </>
          )}

          {(step === "password") && (
            <form onSubmit={handleSubmit} noValidate>
              <div className="flex flex-col gap-6 font-semibold text-sm animate-in fade-in duration-300">
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2">
                  <span className="flex-1 truncate">{email}</span>
                  <button
                    type="button"
                    onClick={resetToEmail}
                    className="text-green-700 hover:text-green-800 flex items-center gap-1 shrink-0"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    <span className="text-xs">{t("register.change")}</span>
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="first_name">{t("register.firstName")}</Label>
                    <Input
                      id="first_name"
                      type="text"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        if (error) setError("");
                      }}
                      autoComplete="given-name"
                      autoFocus
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="last_name">{t("register.lastName")}</Label>
                    <Input
                      id="last_name"
                      type="text"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        if (error) setError("");
                      }}
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">{t("register.password")}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError("");
                      }}
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="confirm_password">{t("register.confirmPassword")}</Label>
                  <div className="relative">
                    <Input
                      id="confirm_password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (error) setError("");
                      }}
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-green-800 hover:bg-green-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={chargement || !isPasswordStepComplete}
                >
                  {chargement ? t("register.creatingAccount") : t("register.createAccount")}
                </Button>
              </div>
            </form>
          )}
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

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400">
        <Link href="/privacy-policy" className="hover:text-gray-600 hover:underline">{t("footer.privacyPolicy")}</Link>
        <span>·</span>
        <Link href="/terms" className="hover:text-gray-600 hover:underline">{t("footer.termsOfUse")}</Link>
        <span>·</span>
        <Link href="/help" className="hover:text-gray-600 hover:underline">
          {t("footer.help")}
        </Link>
      </div>
      <p className="mt-3 text-xs text-gray-400">{t("footer.rights", { year: new Date().getFullYear() })}</p>
    </div>
    </div>
  )
}
