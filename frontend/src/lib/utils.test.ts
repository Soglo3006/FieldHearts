import { describe, it, expect } from 'vitest';
import { cn, formatCAD } from './utils';

// ── formatCAD ─────────────────────────────────────────────────────────────────

describe('formatCAD', () => {
  it('formats an integer as CAD', () => {
    expect(formatCAD(25)).toBe('25.00 $');
  });

  it('formats a decimal value', () => {
    expect(formatCAD(9.99)).toBe('9.99 $');
  });

  it('rounds to 2 decimal places', () => {
    expect(formatCAD(1.456)).toBe('1.46 $');
  });

  it('formats zero', () => {
    expect(formatCAD(0)).toBe('0.00 $');
  });

  it('formats large amounts', () => {
    expect(formatCAD(1500)).toBe('1500.00 $');
  });
});

// ── cn ────────────────────────────────────────────────────────────────────────

describe('cn', () => {
  it('merges two class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('deduplicates conflicting Tailwind classes (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('ignores falsy values', () => {
    expect(cn('foo', false, undefined, null, 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    expect(cn('base', isActive && 'active')).toBe('base active');
  });

  it('returns empty string with no args', () => {
    expect(cn()).toBe('');
  });
});
