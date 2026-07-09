"use client";

import { useCallback, useEffect, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { CreditCard, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type SavedCard = {
  id: string;
  brand?: string;
  last4?: string;
  exp_month?: number;
  exp_year?: number;
};

type PaymentMethodsManagerProps = {
  accessToken: string;
  labels: {
    title: string;
    addCard: string;
    noCards: string;
    remove: string;
    saving: string;
    saveCard: string;
    loadError: string;
  };
};

function SetupCardForm({
  clientSecret,
  onComplete,
  onError,
  saveLabel,
  savingLabel,
}: {
  clientSecret: string;
  onComplete: () => void;
  onError: (msg: string) => void;
  saveLabel: string;
  savingLabel: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSaving(true);
    const { error } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
    });
    if (error) {
      onError(error.message ?? "Setup failed");
      setSaving(false);
      return;
    }
    onComplete();
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 mt-4">
      <PaymentElement options={{ layout: "tabs" }} />
      <Button type="submit" disabled={!stripe || !elements || saving} className="w-full bg-green-700 hover:bg-green-800">
        {saving ? savingLabel : saveLabel}
      </Button>
    </form>
  );
}

export default function PaymentMethodsManager({ accessToken, labels }: PaymentMethodsManagerProps) {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [publishableKey, setPublishableKey] = useState("");
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  const loadCards = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiBase}/payments/payment-methods`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || labels.loadError);
      setCards(data.payment_methods ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.loadError);
    } finally {
      setLoading(false);
    }
  }, [accessToken, apiBase, labels.loadError]);

  const loadStripeConfig = useCallback(async () => {
    const res = await fetch(`${apiBase}/payments/config`);
    const data = await res.json();
    if (res.ok && data.publishable_key) {
      setPublishableKey(data.publishable_key);
      setStripePromise(loadStripe(data.publishable_key));
    }
  }, [apiBase]);

  useEffect(() => {
    loadCards();
    loadStripeConfig();
  }, [loadCards, loadStripeConfig]);

  const startAddCard = async () => {
    setError("");
    try {
      const res = await fetch(`${apiBase}/payments/setup-intent`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || labels.loadError);
      setSetupSecret(data.client_secret);
      setShowAddForm(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.loadError);
    }
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    setError("");
    try {
      const res = await fetch(`${apiBase}/payments/payment-methods/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || labels.loadError);
      }
      await loadCards();
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.loadError);
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
      )}

      {cards.length === 0 && !showAddForm ? (
        <Card className="p-6 text-center text-gray-500 text-sm">{labels.noCards}</Card>
      ) : (
        <div className="space-y-2">
          {cards.map((card) => (
            <Card key={card.id} className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <CreditCard className="h-5 w-5 text-gray-400 shrink-0" />
                <div className="text-sm">
                  <div className="font-medium capitalize">{card.brand ?? "Card"} •••• {card.last4}</div>
                  <div className="text-gray-500">
                    {card.exp_month}/{card.exp_year}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(card.id)}
                disabled={removingId === card.id}
                className="text-gray-400 hover:text-red-600 p-2 cursor-pointer disabled:opacity-50"
                aria-label={labels.remove}
              >
                {removingId === card.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </Card>
          ))}
        </div>
      )}

      {!showAddForm ? (
        <Button onClick={startAddCard} className="w-full bg-green-700 hover:bg-green-800" disabled={!publishableKey}>
          {labels.addCard}
        </Button>
      ) : setupSecret && stripePromise ? (
        <Card className="p-4">
          <Elements stripe={stripePromise} options={{ clientSecret: setupSecret, appearance: { theme: "stripe" } }}>
            <SetupCardForm
              clientSecret={setupSecret}
              saveLabel={labels.saveCard}
              savingLabel={labels.saving}
              onComplete={() => {
                setShowAddForm(false);
                setSetupSecret(null);
                loadCards();
              }}
              onError={(msg) => setError(msg)}
            />
          </Elements>
        </Card>
      ) : null}
    </div>
  );
}
