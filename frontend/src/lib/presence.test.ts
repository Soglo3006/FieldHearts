import { describe, expect, it } from 'vitest';
import { isPresenceOnline, PRESENCE_STALE_AFTER_MS } from './presence';

describe('isPresenceOnline', () => {
  const now = new Date('2026-04-01T12:00:00.000Z').getTime();

  it('returns true when the user is online and recently seen', () => {
    expect(
      isPresenceOnline(
        {
          is_online: true,
          last_seen: new Date(now - 30_000).toISOString(),
        },
        now
      )
    ).toBe(true);
  });

  it('returns false when the presence record is stale', () => {
    expect(
      isPresenceOnline(
        {
          is_online: true,
          last_seen: new Date(now - PRESENCE_STALE_AFTER_MS - 1_000).toISOString(),
        },
        now
      )
    ).toBe(false);
  });

  it('returns false when the user is marked offline', () => {
    expect(
      isPresenceOnline(
        {
          is_online: false,
          last_seen: new Date(now).toISOString(),
        },
        now
      )
    ).toBe(false);
  });
});