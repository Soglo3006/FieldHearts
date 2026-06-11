import type { User } from "@supabase/supabase-js";

export function getMetadataDisplayName(user: User | null | undefined): string | undefined {
  if (!user?.user_metadata) return undefined;
  const meta = user.user_metadata as Record<string, unknown>;
  const full = typeof meta.full_name === "string" ? meta.full_name.trim() : "";
  if (full) return full;
  const first = typeof meta.first_name === "string" ? meta.first_name.trim() : "";
  const last = typeof meta.last_name === "string" ? meta.last_name.trim() : "";
  const combined = [first, last].filter(Boolean).join(" ");
  return combined || undefined;
}

export function getMetadataAccountType(
  user: User | null | undefined
): "person" | "company" | undefined {
  const type = user?.user_metadata?.account_type;
  if (type === "company") return "company";
  if (type === "person") return "person";
  return undefined;
}

export function resolveHeaderDisplayName(
  user: User | null | undefined,
  profile: {
    account_type?: string | null;
    full_name?: string | null;
    company_name?: string | null;
  } | null | undefined
): string | undefined {
  const accountType = profile?.account_type ?? getMetadataAccountType(user);
  if (accountType === "company") {
    return profile?.company_name?.trim() || getMetadataDisplayName(user);
  }
  return profile?.full_name?.trim() || getMetadataDisplayName(user);
}
