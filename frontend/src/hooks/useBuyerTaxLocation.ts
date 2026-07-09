"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyProfile } from "@/hooks/useMyProfile";
import {
  isBillingAddressTaxComplete,
  isProfileTaxLocationComplete,
  type BillingAddressForTax,
} from "@/lib/onboardingSteps";

export function useBuyerTaxLocation() {
  const { session } = useAuth();
  const { profile, loading: profileLoading } = useMyProfile();
  const [billingLoading, setBillingLoading] = useState(true);
  const [hasBillingAddress, setHasBillingAddress] = useState(false);

  useEffect(() => {
    if (!session?.access_token) {
      setHasBillingAddress(false);
      setBillingLoading(false);
      return;
    }

    let cancelled = false;
    setBillingLoading(true);

    void fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing-addresses`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((addresses: BillingAddressForTax[]) => {
        if (cancelled) return;
        const complete = Array.isArray(addresses) && addresses.some(isBillingAddressTaxComplete);
        setHasBillingAddress(complete);
      })
      .catch(() => {
        if (!cancelled) setHasBillingAddress(false);
      })
      .finally(() => {
        if (!cancelled) setBillingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  const profileComplete = isProfileTaxLocationComplete(profile);
  const isComplete = profileComplete || hasBillingAddress;
  const loading = profileLoading || billingLoading;

  return {
    loading,
    isComplete,
    profileComplete,
    hasBillingAddress,
  };
}
