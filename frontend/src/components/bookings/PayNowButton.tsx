"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";

interface Props {
  bookingId: string;
  accessToken: string;
  fullWidth?: boolean;
}

export default function PayNowButton({ bookingId, accessToken, fullWidth }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePay = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ booking_id: bookingId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to start payment");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Button
        size={fullWidth ? "default" : "sm"}
        className={`bg-green-700 hover:bg-green-800 text-white gap-1.5 ${fullWidth ? "w-full h-11" : "flex-1"}`}
        onClick={handlePay}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
        {loading ? "Redirecting…" : "Pay Now"}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
