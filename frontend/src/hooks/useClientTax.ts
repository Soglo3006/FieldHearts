"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getTaxRate, getTaxLabel, normalizeProvince } from "@/lib/taxes";

interface ClientTax {
  taxRate: number;
  taxLabel: string;
  province: string | null;
  loading: boolean;
  missingProvince: boolean;
}

type BillingAddressRow = {
  province?: string | null;
  is_default?: boolean;
};

export function useClientTax(lang = "fr"): ClientTax {
  const { user, session } = useAuth();
  const [province, setProvince] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setProvince(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      let resolved: string | null = null;

      if (session?.access_token) {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing-addresses`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (res.ok) {
            const addresses = (await res.json()) as BillingAddressRow[];
            if (Array.isArray(addresses) && addresses.length > 0) {
              const preferred = addresses.find((a) => a.is_default) ?? addresses[0];
              resolved = preferred?.province?.trim() || null;
            }
          }
        } catch {
          // fall through to profile province
        }
      }

      if (!resolved) {
        const { supabase } = await import("@/lib/supabaseClient");
        const { data } = await supabase.from("users").select("province").eq("id", user.id).single();
        resolved = data?.province?.trim() || null;
      }

      if (!cancelled) {
        setProvince(resolved);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, session?.access_token]);

  const effectiveProvince = province ? normalizeProvince(province) : "QC";
  const taxRate = getTaxRate(effectiveProvince);
  const taxLabel = getTaxLabel(effectiveProvince, lang);
  const missingProvince = !loading && !province;

  return {
    taxRate,
    taxLabel,
    province: province ? effectiveProvince : null,
    loading,
    missingProvince,
  };
}
