import { POST_PATH } from "@/lib/postRoutes";

export type LoginPageContext =
  | "default"
  | "publish"
  | "profile"
  | "service"
  | "favorite"
  | "contact"
  | "booking"
  | "bookings"
  | "favorites"
  | "support";

export type AuthGateOptions = {
  context?: LoginPageContext;
  redirect?: string;
  from?: string;
  onSuccess?: () => void;
  resume?: {
    type: string;
    payload?: Record<string, unknown>;
  };
};

/**
 * `from` (e.g. favorite, contact) refines the headline when present.
 * Otherwise `?redirect=` path selects the context.
 */
export function getLoginPageContext(
  redirect: string | null | undefined,
  from: string | null | undefined,
): LoginPageContext {
  const f = from?.trim().toLowerCase() ?? "";
  if (f === "favorite" || f === "save") return "favorite";
  if (f === "contact" || f === "message") return "contact";
  if (f === "booking" || f === "book") return "booking";
  if (f === "publish" || f === "post") return "publish";
  if (f === "support") return "support";
  if (f === "bookings") return "bookings";
  if (f === "favorites") return "favorites";

  const raw = redirect?.trim() ?? "";
  if (!raw) return "default";
  const path = raw.split("?")[0]?.split("#")[0] ?? "";
  if (!path || path === "/") return "default";
  if (path === POST_PATH || path.startsWith("/post")) return "publish";
  if (path.startsWith("/profile/")) return "profile";
  if (path.startsWith("/serviceDetail/")) return "service";
  if (path.startsWith("/bookings")) return "bookings";
  if (path.startsWith("/favorites")) return "favorites";
  if (path.startsWith("/messages")) return "contact";
  if (path.startsWith("/wallet")) return "bookings";
  return "default";
}

export function resolveAuthGateContext(options: AuthGateOptions): LoginPageContext {
  return options.context ?? getLoginPageContext(options.redirect, options.from);
}

export function normalizeRedirectPath(redirect?: string | null): string | null {
  const raw = redirect?.trim();
  if (!raw) return null;
  const path = raw.split("?")[0]?.split("#")[0] ?? "";
  return path || null;
}

export function pathnameMatchesRedirect(pathname: string, redirectPath: string): boolean {
  if (redirectPath === "/") return pathname === "/";
  return pathname === redirectPath || pathname.startsWith(`${redirectPath}/`);
}
