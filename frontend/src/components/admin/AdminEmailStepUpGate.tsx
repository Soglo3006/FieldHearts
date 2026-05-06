"use client";

/**
 * Second factor for /admin: 6-digit code sent to the logged-in user's email (Resend).
 * Replaces Supabase TOTP / authenticator apps.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessAdminPortal } from "@/lib/auth";
import {
  adminApiHeaders,
  clearAdminStepUpToken,
  setAdminStepUpToken,
} from "@/lib/adminStepUp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Stage = "loading" | "challenge" | "verified";

const apiBase = () => process.env.NEXT_PUBLIC_API_URL || "";

export function AdminEmailStepUpGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, session, loading } = useAuth();
  const [stage, setStage] = useState<Stage>("loading");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentHint, setSentHint] = useState(false);

  const accessToken = session?.access_token;

  const checkStatus = useCallback(async () => {
    if (!accessToken) {
      setStage("loading");
      return;
    }
    setError(null);
    try {
      const res = await fetch(`${apiBase()}/admin/email-otp/status`, {
        headers: adminApiHeaders(accessToken),
      });
      if (!res.ok) {
        clearAdminStepUpToken();
        setStage("challenge");
        return;
      }
      const data = await res.json();
      if (data?.ok) {
        setStage("verified");
        return;
      }
      clearAdminStepUpToken();
      setStage("challenge");
    } catch {
      clearAdminStepUpToken();
      setStage("challenge");
    }
  }, [accessToken]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!canAccessAdminPortal(user)) {
      router.replace("/");
      return;
    }
    if (!accessToken) {
      setStage("loading");
      return;
    }
    checkStatus();
  }, [user, loading, accessToken, router, checkStatus]);

  async function sendCode() {
    if (!accessToken) return;
    setBusy(true);
    setError(null);
    setSentHint(false);
    try {
      const res = await fetch(`${apiBase()}/admin/email-otp/send`, {
        method: "POST",
        headers: adminApiHeaders(accessToken),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.message === "string" ? data.message : "Envoi impossible.");
        return;
      }
      setSentHint(true);
    } catch {
      setError("Erreur réseau. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (!accessToken || code.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase()}/admin/email-otp/verify`, {
        method: "POST",
        headers: {
          ...adminApiHeaders(accessToken),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.message === "string" ? data.message : "Vérification impossible.");
        setCode("");
        return;
      }
      const token = data.stepup_token;
      if (typeof token !== "string") {
        setError("Réponse serveur invalide.");
        return;
      }
      setAdminStepUpToken(token);
      setCode("");
      setStage("verified");
    } catch {
      setError("Erreur réseau. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user || !canAccessAdminPortal(user)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 rounded-full border-4 border-green-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (stage === "verified") {
    return <>{children}</>;
  }

  const maskedEmail = user.email
    ? user.email.replace(/(^.).*(@.*$)/, (_, first, domain) => `${first}***${domain}`)
    : "";

  return (
    <div className="flex items-center justify-center min-h-screen bg-white p-4">
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 w-full max-w-md">
        <div className="flex flex-col items-center gap-2 mb-6 text-center">
          <h1 className="text-lg font-semibold text-gray-900">Vérification par e-mail</h1>
          <p className="text-sm text-gray-500">
            Comme pour un compte Apple : un code à 6 chiffres est envoyé à votre adresse e-mail (
            <span className="font-medium text-gray-700">{maskedEmail}</span>). Aucune application
            d&apos;authentification n&apos;est nécessaire.
          </p>
        </div>

        <div className="flex flex-col gap-3 mb-6">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={busy || !accessToken}
            onClick={sendCode}
          >
            {sentHint ? "Renvoyer le code" : "Recevoir le code par e-mail"}
          </Button>
          {sentHint && (
            <p className="text-xs text-gray-500 text-center">
              Ouvrez votre boîte mail (et les courriers indésirables), puis saisissez le code ci-dessous.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Input
            type="text"
            inputMode="numeric"
            placeholder="000000"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && verifyCode()}
            className="text-center text-xl tracking-widest font-mono"
            autoComplete="one-time-code"
          />
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <Button
            onClick={verifyCode}
            disabled={code.length < 6 || busy}
            className="bg-green-700 hover:bg-green-800 text-white"
          >
            {busy ? "Vérification…" : "Confirmer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
