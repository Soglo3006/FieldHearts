"use client";

import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Mail } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

const COOLDOWN = 60;

export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email || cooldown > 0 || resending) return;
    setResending(true);
    await supabase.auth.resend({ type: "signup", email });
    setResending(false);
    setResent(true);
    setCooldown(COOLDOWN);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 p-4">
              <Mail className="h-12 w-12 text-green-700" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">{t("auth.verifyEmail")}</CardTitle>
          <CardDescription className="text-base mt-2">
            {t("auth.verifyEmailDesc")}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              <strong>Important:</strong> {t("auth.verifyNote")}
            </p>
          </div>

          {email && (
            <div className="space-y-2">
              {resent && (
                <p className="text-sm text-green-700 font-medium text-center">{t("auth.resent")}</p>
              )}
              <Button
                variant="outline"
                className="w-full cursor-pointer"
                onClick={handleResend}
                disabled={cooldown > 0 || resending}
              >
                {resending
                  ? t("auth.resending")
                  : cooldown > 0
                  ? t("auth.resendCooldown", { seconds: cooldown })
                  : t("auth.resendEmail")}
              </Button>
            </div>
          )}

          <Link href="/login" className="block">
            <Button className="w-full bg-green-700 hover:bg-green-800 cursor-pointer">
              {t("auth.backToLogin")}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
