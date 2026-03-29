"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { getTaxRate, getTaxLabel } from "@/lib/taxes";

interface ClientTax {
  taxRate: number;
  taxLabel: string;
  province: string | null;
  loading: boolean;
  missingProvince: boolean;
}

export function useClientTax(lang = "fr"): ClientTax {
  const { user } = useAuth();
  const [province, setProvince] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    supabase
      .from("users")
      .select("province")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error) console.warn("[useClientTax] Supabase error:", error.message, error.code);
        console.log("[useClientTax] province fetched:", data?.province, "user:", user.id);
        setProvince(data?.province ?? null);
        setLoading(false);
      });
  }, [user?.id]);

  const missingProvince = !loading && !province;
  const taxRate  = province ? getTaxRate(province)        : getTaxRate("QC");
  const taxLabel = province ? getTaxLabel(province, lang) : getTaxLabel("QC", lang);

  return { taxRate, taxLabel, province, loading, missingProvince };
}
