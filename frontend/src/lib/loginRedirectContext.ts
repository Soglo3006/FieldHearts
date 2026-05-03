import { POST_PATH } from "@/lib/postRoutes";

export type LoginPageContext =
  | "default"
  | "publish"
  | "profile"
  | "service"
  | "favorite"
  | "contact";

/**
 * `from` (e.g. favorite, contact) refines the headline when present.
 * Otherwise `?redirect=` path selects the context.
 */
export function getLoginPageContext(
  redirect: string | null | undefined,
  from: string | null | undefined
): LoginPageContext {
  const f = from?.trim().toLowerCase() ?? "";
  if (f === "favorite" || f === "save") return "favorite";
  if (f === "contact" || f === "message") return "contact";

  const raw = redirect?.trim() ?? "";
  if (!raw) return "default";
  const path = raw.split("?")[0]?.split("#")[0] ?? "";
  if (!path || path === "/") return "default";
  if (path === POST_PATH || path.startsWith("/post")) return "publish";
  if (path.startsWith("/profile/")) return "profile";
  if (path.startsWith("/serviceDetail/")) return "service";
  return "default";
}
