"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, CreditCard, Clock, ExternalLink } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { useTranslation } from "react-i18next";
import { getFreshAccessToken, createStripeConnectLink, onboardingStripePaths } from "@/lib/stripeConnect";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ConnectStatus {
  connected: boolean;
  charges_enabled: boolean;
  details_submitted: boolean;
}

interface Props {
  accessToken: string;
  accountType?: string;
  autoReconnect?: boolean;
}

export default function StepBankAccount({
  accessToken,
  accountType = "person",
  autoReconnect: _autoReconnect = false,
}: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const { returnPath, refreshPath, bankStep } = onboardingStripePaths(accountType);

  const fetchStatus = useCallback(async (token: string) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/connect/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json() as Promise<ConnectStatus>;
  }, []);

  useEffect(() => {
    if (!accessToken) { setStatusLoading(false); return; }
    fetchStatus(accessToken)
      .then((data) => { if (data) setStatus(data); })
      .catch(() => {})
      .finally(() => setStatusLoading(false));
  }, [accessToken, fetchStatus]);

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    try {
      const { url, accessToken: freshToken } = await createStripeConnectLink({
        accessToken,
        returnPath,
        refreshPath,
      });

      if (!freshToken) {
        const loginReturn = encodeURIComponent(`/profile/complete_profil?type=${accountType}&step=${bankStep}`);
        const email = user?.email ? encodeURIComponent(user.email) : "";
        toast.info(t("onboarding.stripeSessionExpired"));
        router.push(email ? `/login?email=${email}&redirect=${loginReturn}` : `/login?redirect=${loginReturn}`);
        setConnecting(false);
        return;
      }

      if (url) {
        window.location.href = url;
        return;
      }

      toast.error(t("onboarding.stripeConnectFailed"));
      setConnecting(false);
    } catch {
      toast.error(t("onboarding.stripeConnectFailed"));
      setConnecting(false);
    }
  }, [accessToken, returnPath, refreshPath, accountType, bankStep, router, t, user?.email]);

  if (statusLoading) {
    return (
      <Card className="p-6 sm:p-8 animate-in fade-in duration-300">
        <div className="flex flex-col items-center gap-3 py-8">
          <Spinner size="md" />
        </div>
      </Card>
    );
  }

  if (status?.charges_enabled) {
    return (
      <Card className="p-6 sm:p-8 animate-in fade-in duration-300">
        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="h-6 w-6 text-green-700 shrink-0" />
          <h2 className="text-xl font-bold text-gray-900">{t("onboarding.bankAccount")}</h2>
        </div>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
          <p className="font-semibold text-gray-900">{t("onboarding.bankConnected")}</p>
          <p className="text-sm text-gray-500">{t("onboarding.bankConnectedDesc")}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-3 mb-1">
        <CreditCard className="h-6 w-6 text-green-700 shrink-0" />
        <h2 className="text-xl font-bold text-gray-900">{t("onboarding.bankAccount")}</h2>
      </div>
      <p className="text-gray-500 text-sm mb-4">{t("onboarding.bankAccountSubtitle")}</p>

      {status?.details_submitted ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <Clock className="h-12 w-12 text-yellow-400" />
          <p className="font-semibold text-gray-900">{t("onboarding.bankPending")}</p>
          <p className="text-sm text-gray-500 max-w-xs">{t("onboarding.bankPendingDesc")}</p>
          <Button
            type="button"
            variant="outline"
            onClick={handleConnect}
            disabled={connecting}
            className="mt-2 min-w-[220px] h-11 text-sm"
          >
            {connecting ? (
              <Spinner size="sm" />
            ) : (
              <span className="inline-flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                {t("onboarding.bankCompleteFile")}
              </span>
            )}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-0 text-center">
          <div>
            <p className="font-semibold text-gray-900 mb-1">{t("onboarding.bankReceiveTitle")}</p>
            <p className="text-sm text-gray-500 max-w-xs">{t("onboarding.bankReceiveDesc")}</p>
          </div>
          <Button
            type="button"
            onClick={handleConnect}
            disabled={connecting}
            className="bg-green-700 hover:bg-green-800 text-white min-w-[220px] h-11 rounded-xl text-sm"
          >
            {connecting ? (
              <Spinner size="sm" className="border-white border-t-transparent" />
            ) : (
              <span>
                {t("onboarding.bankConnectBtn")}
              </span>
            )}
          </Button>
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-gray-300" />
            {t("onboarding.bankSecuredBy")}
          </p>
        </div>
      )}
    </Card>
  );
}
