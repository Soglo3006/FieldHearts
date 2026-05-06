const HEADER = "X-Uneden-Admin-Stepup";
const STORAGE_KEY = "uneden_admin_stepup";

export function getAdminStepUpToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(STORAGE_KEY);
}

export function setAdminStepUpToken(token: string): void {
  sessionStorage.setItem(STORAGE_KEY, token);
}

export function clearAdminStepUpToken(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

/** Use for all /api/admin/* and other adminOnly backend routes (disputes list, support, wallet/export, etc.). */
export function adminApiHeaders(accessToken: string): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };
  const step = getAdminStepUpToken();
  if (step) headers[HEADER] = step;
  return headers;
}
