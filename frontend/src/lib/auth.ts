import type { User } from "@supabase/supabase-js";

/**
 * Determines whether a given Supabase user should be treated as an admin.
 *
 * Supported criteria:
 * - Email allowlist via NEXT_PUBLIC_ADMIN_EMAILS (comma-separated)
 * - User ID allowlist via NEXT_PUBLIC_ADMIN_USER_IDS (comma-separated)
 * - Role stored in user/app metadata: role === "admin" or roles includes "admin"
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

  // Metadata-based role checks
  const um: Record<string, unknown> = user.user_metadata || {};
  const am: Record<string, unknown> = user.app_metadata || {};

  const metaRole = String(um.role || am.role || "").toLowerCase();
  if (metaRole === "admin") return true;

  const umRoles = Array.isArray(um.roles) ? (um.roles as unknown[]) : [];
  const amRoles = Array.isArray(am.roles) ? (am.roles as unknown[]) : [];
  const roles = umRoles.length ? umRoles : amRoles;
  if (roles.map((r) => String(r).toLowerCase()).includes("admin")) return true;

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
