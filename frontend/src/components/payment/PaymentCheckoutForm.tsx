"use client";

import { useEffect, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";
import { bookingBtnGreen } from "@/components/bookings/bookingButtonStyles";
import { cn } from "@/lib/utils";

type PaymentCheckoutFormProps = {
  clientSecret: string;
  publishableKey: string;
  onSuccess: () => void | Promise<void>;
  onError: (message: string) => void;
  disabled?: boolean;
  submitLabel: string;
  processingLabel: string;
  loadingLabel?: string;
  /** Fill parent height: PaymentElement scrolls, pay button stays sticky at the bottom. */
  fillHeight?: boolean;
  footerNote?: string;
  /** Stripe redirect return URL (deep-link back into the open booking). */
  returnUrl?: string;
};

function isIncompleteCardError(error: { type?: string; code?: string; message?: string }) {
  if (error.type === "validation_error") return true;
  if (error.code?.startsWith("incomplete_")) return true;
  return /incomplet/i.test(error.message ?? "");
}

function CheckoutForm({
  onSuccess,
  onError,
  disabled,
  submitLabel,
  processingLabel,
  fillHeight,
  footerNote,
  returnUrl,
}: Omit<PaymentCheckoutFormProps, "clientSecret" | "publishableKey" | "loadingLabel">) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);

  const handlePaymentChange = (event: { complete: boolean }) => {
    setPaymentReady(event.complete);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || disabled || !paymentReady) return;

    setProcessing(true);
    const resolvedReturnUrl =
      returnUrl ||
      (typeof window !== "undefined"
        ? `${window.location.origin}${window.location.pathname}${window.location.search || ""}`
        : `${typeof window !== "undefined" ? window.location.origin : ""}/bookings`);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: resolvedReturnUrl,
      },
    });

    if (error) {
      // Incomplete fields: keep the button blocked via paymentReady — no red banner.
      if (!isIncompleteCardError(error)) {
        onError(error.message ?? "Payment failed");
      }
      setProcessing(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      try {
        await onSuccess();
      } catch {
        setProcessing(false);
      }
      return;
    }

    setProcessing(false);
  };

  const canSubmit = Boolean(stripe && elements && paymentReady && !processing && !disabled);

  const submitButton = (
    <button
      type="submit"
      disabled={!canSubmit}
      aria-busy={processing}
      className={cn(
        "w-full h-14 text-base font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
        bookingBtnGreen,
      )}
    >
      {processing ? (
        <span className="inline-flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          {processingLabel}
        </span>
      ) : (
        submitLabel
      )}
    </button>
  );

  const paymentFields = (
    <PaymentElement options={{ layout: "tabs" }} onChange={handlePaymentChange} />
  );

  if (fillHeight) {
    return (
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {paymentFields}
        </div>
        <div className="shrink-0 border-t border-gray-100 px-5 py-4">
          {submitButton}
          {footerNote ? (
            <p className="mt-2 text-center text-xs text-gray-400">{footerNote}</p>
          ) : null}
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {paymentFields}
      {submitButton}
      {footerNote ? (
        <p className="text-center text-xs text-gray-400">{footerNote}</p>
      ) : null}
    </form>
  );
}

export default function PaymentCheckoutForm(props: PaymentCheckoutFormProps) {
  const {
    clientSecret,
    publishableKey,
    processingLabel,
    loadingLabel = processingLabel,
    fillHeight,
    ...rest
  } = props;
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);

  useEffect(() => {
    if (publishableKey) {
      setStripePromise(loadStripe(publishableKey));
    }
  }, [publishableKey]);

  if (!stripePromise || !clientSecret) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-8 text-sm text-gray-500 ${
          fillHeight ? "min-h-0 flex-1" : "min-h-[220px]"
        }`}
      >
        <Loader2 className="h-5 w-5 animate-spin text-green-700" />
        <span>{loadingLabel}</span>
      </div>
    );
  }

  return (
    <div className={fillHeight ? "flex min-h-0 flex-1 flex-col" : undefined}>
      <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
        <CheckoutForm {...rest} processingLabel={processingLabel} fillHeight={fillHeight} />
      </Elements>
    </div>
  );
}
