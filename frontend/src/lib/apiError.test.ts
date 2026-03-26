import { describe, it, expect } from 'vitest';
import { getApiErrorMessage, getSafeErrorMessage } from './apiError';

// ── getApiErrorMessage ────────────────────────────────────────────────────────

describe('getApiErrorMessage', () => {
  it('returns the backend message when short and valid', async () => {
    const res = new Response(JSON.stringify({ message: 'Email already in use' }), { status: 400 });
    expect(await getApiErrorMessage(res)).toBe('Email already in use');
  });

  it('returns fallback when message is too long (>= 200 chars)', async () => {
    const longMsg = 'x'.repeat(200);
    const res = new Response(JSON.stringify({ message: longMsg }), { status: 400 });
    expect(await getApiErrorMessage(res)).toBe('Something went wrong. Please try again.');
  });

  it('returns fallback when body is not JSON', async () => {
    const res = new Response('Internal Server Error', { status: 500 });
    expect(await getApiErrorMessage(res)).toBe('Something went wrong. Please try again.');
  });

  it('returns fallback when message field is missing', async () => {
    const res = new Response(JSON.stringify({ error: 'oops' }), { status: 400 });
    expect(await getApiErrorMessage(res)).toBe('Something went wrong. Please try again.');
  });

  it('uses a custom fallback when provided', async () => {
    const res = new Response('bad', { status: 500 });
    expect(await getApiErrorMessage(res, 'Custom error')).toBe('Custom error');
  });
});

// ── getSafeErrorMessage ───────────────────────────────────────────────────────

describe('getSafeErrorMessage', () => {
  it('returns the error message for a normal Error', () => {
    expect(getSafeErrorMessage(new Error('Network failed'))).toBe('Network failed');
  });

  it('returns fallback for a long error message', () => {
    const err = new Error('x'.repeat(200));
    expect(getSafeErrorMessage(err)).toBe('Something went wrong. Please try again.');
  });

  it('returns fallback for a non-Error value', () => {
    expect(getSafeErrorMessage('raw string')).toBe('Something went wrong. Please try again.');
    expect(getSafeErrorMessage(42)).toBe('Something went wrong. Please try again.');
    expect(getSafeErrorMessage(null)).toBe('Something went wrong. Please try again.');
  });

  it('uses a custom fallback', () => {
    expect(getSafeErrorMessage(null, 'Try again later')).toBe('Try again later');
  });
});
