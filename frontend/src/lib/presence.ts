export const PRESENCE_HEARTBEAT_MS = 30_000;
export const PRESENCE_STALE_AFTER_MS = 75_000;

export interface PresenceRecord {
  is_online?: boolean | null;
  last_seen?: string | null;
}

export function isPresenceOnline(
  presence: PresenceRecord | null | undefined,
  now = Date.now()
): boolean {
  if (!presence?.is_online || !presence.last_seen) {
    return false;
  }

  const lastSeenAt = new Date(presence.last_seen).getTime();
  if (Number.isNaN(lastSeenAt)) {
    return false;
  }

  return now - lastSeenAt <= PRESENCE_STALE_AFTER_MS;
}