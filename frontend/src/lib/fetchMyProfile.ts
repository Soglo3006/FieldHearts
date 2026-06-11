import { readMyProfileCache, writeMyProfileCache } from "@/lib/myProfileCache";

const inflight = new Map<string, Promise<Record<string, unknown> | null>>();

export async function fetchMyProfileOnce(
  userId: string,
  accessToken: string
): Promise<Record<string, unknown> | null> {
  let request = inflight.get(userId);
  if (!request) {
    request = fetch(`${process.env.NEXT_PUBLIC_API_URL}/profiles/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Record<string, unknown> | null) => {
        if (data) writeMyProfileCache(userId, data);
        return data;
      })
      .catch(() => null)
      .finally(() => {
        inflight.delete(userId);
      });
    inflight.set(userId, request);
  }
  return request;
}

export function getCachedMyProfile(userId: string): Record<string, unknown> | null {
  return readMyProfileCache(userId);
}
