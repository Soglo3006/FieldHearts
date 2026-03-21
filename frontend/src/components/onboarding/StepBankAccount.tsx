"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, CreditCard, ExternalLink, Clock } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

interface ConnectStatus {
  connected: boolean;
  charges_enabled: boolean;
  details_submitted: boolean;
}

interface Props {
  accessToken: string;
  accountType?: string;
}

export default function StepBankAccount({ accessToken, accountType = "person" }: Props) {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/connect/status`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken]);

  const handleConnect = async () => {
    setConnecting(true);
    // Step 6 for person (7 total), step 4 for company (5 total)
    const bankStep = accountType === "company" ? 4 : 6;
    const returnPath = `/profile/complete_profil?type=${accountType}&stripe=success&step=${bankStep}`;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/connect/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ return_url: returnPath }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      /* silent */
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Card className="p-6 sm:p-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-3 mb-1">
        <CreditCard className="h-6 w-6 text-green-700 shrink-0" />
        <h2 className="text-xl font-bold text-gray-900">Compte bancaire</h2>
      </div>
      <p className="text-gray-500 text-sm mb-8">
        Connectez votre compte bancaire pour recevoir vos paiements. Vous pouvez passer cette étape et le faire plus tard.
      </p>

      {loading ? (
        <div className="flex justify-center py-4">
          <Spinner size="md" />
        </div>
      ) : status?.charges_enabled ? (
        /* Connected */
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
          <p className="font-semibold text-gray-900">Compte connecté !</p>
          <p className="text-sm text-gray-500">Vous êtes prêt à recevoir des paiements via Stripe.</p>
        </div>
      ) : status?.details_submitted ? (
        /* Pending verification */
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <Clock className="h-12 w-12 text-yellow-400" />
          <p className="font-semibold text-gray-900">Vérification en cours</p>
          <p className="text-sm text-gray-500 max-w-xs">Stripe examine vos informations. Vous recevrez une confirmation sous 1–2 jours ouvrables.</p>
          <Button
            type="button"
            variant="outline"
            onClick={handleConnect}
            disabled={connecting}
            className="mt-2 gap-2 text-sm"
          >
            {connecting ? <Spinner size="sm" /> : <ExternalLink className="h-4 w-4" />}
            Compléter mon dossier
          </Button>
        </div>
      ) : (
        /* Not connected */
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
            <CreditCard className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Recevez vos paiements</p>
            <p className="text-sm text-gray-500 max-w-xs">
              Connectez votre compte bancaire pour recevoir vos versements directement, de façon sécurisée via Stripe.
            </p>
          </div>
          <Button
            type="button"
            onClick={handleConnect}
            disabled={connecting}
            className="bg-green-700 hover:bg-green-800 text-white gap-2 px-6 h-11 rounded-xl text-sm"
          >
            {connecting ? <Spinner size="sm" /> : <CreditCard className="h-4 w-4" />}
            Connecter mon compte
          </Button>
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-gray-300" />
            Sécurisé par Stripe
          </p>
        </div>
      )}
    </Card>
  );
}
