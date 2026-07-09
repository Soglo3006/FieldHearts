"use client";

import { useEffect, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

type PaymentCheckoutFormProps = {
  clientSecret: string;
  publishableKey: string;
  onSuccess: () => void;
  onError: (message: string) => void;
  disabled?: boolean;
  submitLabel: string;
  processingLabel: string;
};

function CheckoutForm({
  onSuccess,
  onError,
  disabled,
  submitLabel,
  processingLabel,
}: Omit<PaymentCheckoutFormProps, "clientSecret" | "publishableKey">) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || disabled) return;

    setProcessing(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      onError(error.message ?? "Payment failed");
      setProcessing(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      onSuccess();
      return;
    }

    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      <button
        type="submit"
        disabled={!stripe || !elements || processing || disabled}
        className="w-full h-14 text-base font-semibold bg-green-700 hover:bg-green-800 text-white rounded-xl disabled:opacity-50"
      >
        {processing ? processingLabel : submitLabel}
      </button>
    </form>
  );
}

export default function PaymentCheckoutForm(props: PaymentCheckoutFormProps) {
  const { clientSecret, publishableKey, ...rest } = props;
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);

  useEffect(() => {
    if (publishableKey) {
      setStripePromise(loadStripe(publishableKey));
    }
  }, [publishableKey]);

  if (!stripePromise || !clientSecret) return null;

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
      <CheckoutForm {...rest} />
    </Elements>
  );
}
