/** Buyer fee at checkout (unchanged). */
export const BUYER_COMMISSION_RATE = 0.05;

/** Early-user promotional worker/platform commission. */
export const WORKER_COMMISSION_RATE = 0.05;

/** Standard rate for disclosure copy (not currently charged). */
export const STANDARD_WORKER_COMMISSION_RATE = 0.2;

export const WORKER_PAYOUT_SHARE = 1 - WORKER_COMMISSION_RATE;

export function workerNetFromGross(gross: number): number {
  return gross * WORKER_PAYOUT_SHARE;
}

export function workerCommissionFromGross(gross: number): number {
  return gross * WORKER_COMMISSION_RATE;
}

export function formatCommissionPercent(rate: number, locale: string): string {
  const pct = rate * 100;
  return new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    maximumFractionDigits: pct % 1 === 0 ? 0 : 1,
  }).format(pct);
}
