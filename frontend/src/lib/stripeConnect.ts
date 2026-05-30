import { supabase } from "@/lib/supabaseClient";

export async function getFreshAccessToken(fallback?: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) return fallback ?? null;
    return data.session?.access_token ?? fallback ?? null;
  } catch {
    return fallback ?? null;
  }
}

export async function createStripeConnectLink(options: {
  accessToken?: string;
  returnPath: string;
  refreshPath: string;
}): Promise<{ url: string | null; accessToken: string | null }> {
  const accessToken = await getFreshAccessToken(options.accessToken);
  if (!accessToken) return { url: null, accessToken: null };

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/connect/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      return_url: options.returnPath,
      refresh_url: options.refreshPath,
    }),
  });

  if (!res.ok) return { url: null, accessToken };

  const data = await res.json();
  return { url: data.url ?? null, accessToken };
}

export async function createStripeAccountSession(accessToken?: string): Promise<{ clientSecret: string | null }> {
  const token = await getFreshAccessToken(accessToken);
  if (!token) return { clientSecret: null };

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/connect/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) return { clientSecret: null };
  const data = await res.json();
  return { clientSecret: data.client_secret ?? null };
}

export function onboardingStripePaths(accountType: string) {
  const bankStep = accountType === "company" ? 5 : 6;
  const base = `/profile/complete_profil?type=${accountType}&step=${bankStep}`;
  return {
    bankStep,
    returnPath: `${base}&stripe=success`,
    refreshPath: `${base}&stripe=refresh`,
  };
}
