"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { CheckCircle2, CreditCard, Clock } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { useTranslation } from "react-i18next";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import {
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
} from "@stripe/react-connect-js";
import { getFreshAccessToken } from "@/lib/stripeConnect";

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
  accountType: _accountType = "person",
  autoReconnect: _autoReconnect = false,
}: Props) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [stripeInstance, setStripeInstance] = useState<ReturnType<typeof loadConnectAndInitialize> | null>(null);
  const [initError, setInitError] = useState(false);
  const initStarted = useRef(false);

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

  useEffect(() => {
    if (statusLoading) return;
    if (status?.charges_enabled) return;
    if (initStarted.current) return;
    initStarted.current = true;

    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) { setInitError(true); return; }

    const instance = loadConnectAndInitialize({
      publishableKey,
      fetchClientSecret: async () => {
        const token = await getFreshAccessToken(accessToken);
        if (!token) return "";
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/connect/session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) return "";
        const data = await res.json();
        return data.client_secret ?? "";
      },
      appearance: {
        overlays: "dialog",
        variables: {
          colorPrimary: "#15803d",
          fontFamily: "Inter, sans-serif",
          borderRadius: "8px",
        },
      },
    });

    setStripeInstance(instance);
  }, [statusLoading, status?.charges_enabled, accessToken]);

  const handleOnboardingExit = useCallback(async () => {
    const token = await getFreshAccessToken(accessToken);
    if (!token) return;
    const data = await fetchStatus(token);
    if (data) setStatus(data);
  }, [accessToken, fetchStatus]);

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
      <p className="text-gray-500 text-sm mb-6">{t("onboarding.bankAccountSubtitle")}</p>

      {status?.details_submitted && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-yellow-50 rounded-lg">
          <Clock className="h-4 w-4 text-yellow-500 shrink-0" />
          <p className="text-sm text-yellow-700">{t("onboarding.bankPendingDesc")}</p>
        </div>
      )}

      {initError ? (
        <p className="text-sm text-red-500 text-center py-4">{t("onboarding.stripeConnectFailed")}</p>
      ) : !stripeInstance ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <Spinner size="md" />
          <p className="text-sm text-gray-500">{t("onboarding.stripeLoading")}</p>
        </div>
      ) : (
        <ConnectComponentsProvider connectInstance={stripeInstance}>
          <ConnectAccountOnboarding onExit={handleOnboardingExit} />
        </ConnectComponentsProvider>
      )}
    </Card>
  );
}
