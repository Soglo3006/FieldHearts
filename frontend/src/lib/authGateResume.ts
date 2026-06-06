const STORAGE_KEY = "uneden_auth_resume";

export type AuthResumeAction = {
  type: string;
  payload?: Record<string, unknown>;
  createdAt: number;
};

export function setAuthResume(action: { type: string; payload?: Record<string, unknown> }) {
  if (typeof window === "undefined") return;
  const entry: AuthResumeAction = { ...action, createdAt: Date.now() };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
}

export function clearAuthResume() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

export function consumeAuthResume(expectedType?: string): AuthResumeAction | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AuthResumeAction;
    if (!parsed?.type) return null;
    if (expectedType && parsed.type !== expectedType) return null;
    if (Date.now() - parsed.createdAt > 30 * 60 * 1000) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    sessionStorage.removeItem(STORAGE_KEY);
    return parsed;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}
