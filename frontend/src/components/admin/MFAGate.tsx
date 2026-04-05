"use client";

/**
 * MFAGate — wraps any admin page.
 *
 * States:
 *  • loading    — checking session AAL
 *  • enroll     — admin has no TOTP factor yet → show QR enrolment
 *  • challenge  — admin has a factor but this session is aal1 → ask for code
 *  • verified   — session is aal2 → render children
 */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import Image from "next/image";

type Stage = "loading" | "enroll" | "challenge" | "verified";

interface EnrollData {
  factorId: string;
  qrCode: string;   // SVG data URI
  secret: string;
}

export function MFAGate({ children }: { children: React.ReactNode }) {
  const [stage, setStage] = useState<Stage>("loading");
  const [enrollData, setEnrollData] = useState<EnrollData | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkAAL();
  }, []);

  async function checkAAL() {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error || !data) { setStage("verified"); return; } // fallback: let backend enforce

    if (data.currentLevel === "aal2") {
      setStage("verified");
      return;
    }

    // Does this admin already have a TOTP factor enrolled?
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const totpFactor = factorsData?.totp?.find((f) => f.status === "verified");

    if (totpFactor) {
      // Factor exists but not yet challenged this session → challenge flow
      setFactorId(totpFactor.id);
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
      if (challengeError || !challengeData) {
        setError("Failed to initiate MFA challenge. Please refresh.");
        setStage("challenge");
        return;
      }
      setChallengeId(challengeData.id);
      setStage("challenge");
    } else {
      // No factor enrolled yet → enroll
      await startEnrollment();
    }
  }

  async function startEnrollment() {
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", issuer: "Uneden Admin", friendlyName: "Uneden Admin" });
    if (error || !data) {
      setError("Failed to start MFA enrollment. Please refresh.");
      setStage("enroll");
      return;
    }
    setEnrollData({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    // Start a challenge right away so we can verify immediately after scanning
    const { data: challengeData } = await supabase.auth.mfa.challenge({ factorId: data.id });
    if (challengeData) setChallengeId(challengeData.id);
    setFactorId(data.id);
    setStage("enroll");
  }

  async function handleVerify() {
    if (!factorId || !challengeId || code.length < 6) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
    setLoading(false);
    if (error) {
      setError("Invalid code. Please try again.");
      setCode("");
      return;
    }
    setStage("verified");
  }

  if (stage === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 rounded-full border-4 border-green-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (stage === "verified") {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 mb-6 text-center">
          {stage === "enroll" ? (
            <ShieldAlert className="h-10 w-10 text-amber-500" />
          ) : (
            <ShieldCheck className="h-10 w-10 text-green-600" />
          )}
          <h1 className="text-lg font-semibold text-gray-900">
            {stage === "enroll" ? "Activer l'authentification 2FA" : "Vérification 2FA requise"}
          </h1>
          <p className="text-sm text-gray-500">
            {stage === "enroll"
              ? "Scannez ce code QR avec Google Authenticator ou Authy, puis entrez le code affiché."
              : "Entrez le code à 6 chiffres de votre application d'authentification."}
          </p>
        </div>

        {stage === "enroll" && enrollData && (
          <div className="flex flex-col items-center gap-3 mb-5">
            {/* QR code is an SVG data URI from Supabase */}
            <div className="border border-gray-200 rounded-lg p-2 bg-white">
              <img src={enrollData.qrCode} alt="QR code 2FA" width={180} height={180} />
            </div>
            <p className="text-xs text-gray-400 break-all text-center">
              Clé manuelle : <span className="font-mono font-semibold text-gray-700">{enrollData.secret}</span>
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Input
            type="text"
            inputMode="numeric"
            placeholder="000000"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            className="text-center text-xl tracking-widest font-mono"
          />
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <Button
            onClick={handleVerify}
            disabled={code.length < 6 || loading}
            className="bg-green-700 hover:bg-green-800 text-white"
          >
            {loading ? "Vérification…" : "Confirmer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
