const KEY_PREFIX = "uneden_my_profile_";

export function readMyProfileCache(userId: string): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${KEY_PREFIX}${userId}`);
    if (!raw) return null;
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function writeMyProfileCache(userId: string, profile: unknown): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`${KEY_PREFIX}${userId}`, JSON.stringify(profile));
  } catch {
    // ignore quota / private mode
  }
}

export function clearMyProfileCache(userId?: string): void {
  if (typeof window === "undefined") return;
  try {
    if (userId) {
      sessionStorage.removeItem(`${KEY_PREFIX}${userId}`);
      return;
    }
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(KEY_PREFIX)) sessionStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}
