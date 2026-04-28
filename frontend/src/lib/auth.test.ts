import { describe, it, expect, beforeEach } from 'vitest';
import { isAdminUser } from './auth';
import type { User } from '@supabase/supabase-js';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'test-user-id',
    email: 'user@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '',
    ...overrides,
  } as User;
}

describe('isAdminUser', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_ADMIN_EMAILS;
    delete process.env.NEXT_PUBLIC_ADMIN_USER_IDS;
  });

  it('returns false for null', () => {
    expect(isAdminUser(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isAdminUser(undefined)).toBe(false);
  });

  it('returns false for a regular user with no env vars', () => {
    expect(isAdminUser(makeUser())).toBe(false);
  });

  it('returns true when email is in NEXT_PUBLIC_ADMIN_EMAILS', () => {
    process.env.NEXT_PUBLIC_ADMIN_EMAILS = 'admin@example.com,super@example.com';
    expect(isAdminUser(makeUser({ email: 'admin@example.com' }))).toBe(true);
  });

  it('is case-insensitive for email match', () => {
    process.env.NEXT_PUBLIC_ADMIN_EMAILS = 'Admin@Example.com';
    expect(isAdminUser(makeUser({ email: 'admin@example.com' }))).toBe(true);
  });

  it('returns false when email is not in the allowlist', () => {
    process.env.NEXT_PUBLIC_ADMIN_EMAILS = 'other@example.com';
    expect(isAdminUser(makeUser({ email: 'user@example.com' }))).toBe(false);
  });

  it('returns true when user ID is in NEXT_PUBLIC_ADMIN_USER_IDS', () => {
    process.env.NEXT_PUBLIC_ADMIN_USER_IDS = 'abc-123,def-456';
    expect(isAdminUser(makeUser({ id: 'abc-123' }))).toBe(true);
  });

  it('returns false when only user_metadata.role is "admin" (not server-controlled)', () => {
    expect(isAdminUser(makeUser({ user_metadata: { role: 'admin' } }))).toBe(false);
  });

  it('returns true when app_metadata.role is "admin"', () => {
    expect(isAdminUser(makeUser({ app_metadata: { role: 'admin' } }))).toBe(true);
  });

  it('returns true when app_metadata.roles includes "admin"', () => {
    expect(isAdminUser(makeUser({ app_metadata: { roles: ['editor', 'admin'] } }))).toBe(true);
  });

  it('returns false when only user_metadata.roles includes "admin"', () => {
    expect(isAdminUser(makeUser({ user_metadata: { roles: ['editor', 'admin'] } }))).toBe(false);
  });

  it('returns false when app_metadata roles array does not include "admin"', () => {
    expect(isAdminUser(makeUser({ app_metadata: { roles: ['editor'] } }))).toBe(false);
  });
});
