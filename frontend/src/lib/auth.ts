import type { User } from "@supabase/supabase-js";

/**
 * Determines whether a given Supabase user should be treated as an admin.
 *
 * Supported criteria:
 * - Email allowlist via NEXT_PUBLIC_ADMIN_EMAILS (comma-separated)
 * - User ID allowlist via NEXT_PUBLIC_ADMIN_USER_IDS (comma-separated)
 * - Role in app_metadata only: role === "admin" or roles includes "admin" (not user_metadata;
 *   the latter is user-editable and is ignored for this check per Supabase security guidance)
 */
export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;

  const email = (user.email || "").toLowerCase();
  const userId = user.id;

  // Env-based allowlists (client-visible by NEXT_PUBLIC)
  const emailList = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const idList = (process.env.NEXT_PUBLIC_ADMIN_USER_IDS || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (email && emailList.includes(email)) return true;
  if (userId && idList.includes(userId)) return true;

  const am: Record<string, unknown> = user.app_metadata || {};
  const metaRole = String(am.role || "").toLowerCase();
  if (metaRole === "admin") return true;
  const amRoles = Array.isArray(am.roles) ? (am.roles as unknown[]) : [];
  if (amRoles.map((r) => String(r).toLowerCase()).includes("admin")) return true;

  return false;
}

/**
 * Support-only accounts can access /admin/* but are blocked from the main site.
 * Configure via NEXT_PUBLIC_SUPPORT_EMAILS (comma-separated).
 * A support user is NOT treated as a full admin (isAdminUser returns false for them
 * unless they are also in NEXT_PUBLIC_ADMIN_EMAILS).
 */
export function isSupportOnlyUser(user: User | null | undefined): boolean {
  if (!user) return false;
  const email = (user.email || "").toLowerCase();
  const list = (process.env.NEXT_PUBLIC_SUPPORT_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email);
}
