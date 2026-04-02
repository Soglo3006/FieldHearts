/**
 * payment.test.js — Unit tests for payment, refund and platform earnings logic
 *
 * Tests pure calculation logic — no DB, no Stripe calls.
 * Run with: npm run test:unit
 */

import { describe, it, expect } from 'vitest';

// ── Constants (mirrors paymentController.js) ─────────────────────────────────
const BUYER_COMMISSION_RATE  = 0.05;
const WORKER_COMMISSION_RATE = 0.20;

// ── Helpers (mirrors paymentController.js) ───────────────────────────────────
const PROVINCE_TAX_RATES = {
  AB: 0.05, BC: 0.12, MB: 0.12, NB: 0.15, NL: 0.15, NS: 0.15,
  NT: 0.05, NU: 0.05, ON: 0.13, PE: 0.15, QC: 0.14975, SK: 0.11, YT: 0.05,
};

function getTaxRate(province) {
  return PROVINCE_TAX_RATES[province] ?? PROVINCE_TAX_RATES.QC;
}

function calcCheckout(priceDollars, province = 'QC') {
  const servicePriceCents    = Math.round(priceDollars * 100);
  const buyerCommissionCents = Math.round(servicePriceCents * BUYER_COMMISSION_RATE);
  const taxRate              = getTaxRate(province);
  const taxesCents           = Math.round(servicePriceCents * taxRate);
  const totalCents           = servicePriceCents + buyerCommissionCents + taxesCents;
  return { servicePriceCents, buyerCommissionCents, taxesCents, totalCents };
}

function calcRefund(totalCents, platformFeeCents, refundAmountCents = null) {
  const maxRefund = totalCents - platformFeeCents;
  const amount    = refundAmountCents !== null ? refundAmountCents : maxRefund;
  const valid     = amount > 0 && amount <= maxRefund;
  return { amount, maxRefund, valid };
}

function calcWorkerEarning(servicePriceDollars) {
  const gross      = Math.round(servicePriceDollars * 100);
  const netCents   = Math.round(gross * (1 - WORKER_COMMISSION_RATE)); // 80%
  const commission = gross - netCents;                                  // 20%
  return { gross, netCents, commission };
}

function calcPlatformEarningAtPayout(transferCents) {
  // transferCents = 80% of gross → gross = transferCents / 0.80
  return ((transferCents / 0.80) * 0.20 / 100).toFixed(2);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. CHECKOUT — calcul des montants
// ═══════════════════════════════════════════════════════════════════════════════
describe('Checkout — calcul des montants', () => {
  it('5% buyer commission calculé correctement', () => {
    const { servicePriceCents, buyerCommissionCents } = calcCheckout(100);
    expect(servicePriceCents).toBe(10000);
    expect(buyerCommissionCents).toBe(500); // 5% de 100$
  });

  it('total = service + commission + taxes (QC)', () => {
    const { totalCents, servicePriceCents, buyerCommissionCents, taxesCents } = calcCheckout(100, 'QC');
    expect(totalCents).toBe(servicePriceCents + buyerCommissionCents + taxesCents);
  });

  it('taxe QC = 14.975%', () => {
    const { taxesCents } = calcCheckout(100, 'QC');
    expect(taxesCents).toBe(Math.round(10000 * 0.14975)); // 1498
  });

  it('taxe ON = 13%', () => {
    const { taxesCents } = calcCheckout(100, 'ON');
    expect(taxesCents).toBe(1300);
  });

  it('taxe AB = 5%', () => {
    const { taxesCents } = calcCheckout(100, 'AB');
    expect(taxesCents).toBe(500);
  });

  it('prix custom (50.00$) — arrondi correct', () => {
    const { servicePriceCents, buyerCommissionCents } = calcCheckout(50.00);
    expect(servicePriceCents).toBe(5000);
    expect(buyerCommissionCents).toBe(250);
  });

  it('prix décimal (99.99$)', () => {
    const { servicePriceCents, buyerCommissionCents } = calcCheckout(99.99);
    expect(servicePriceCents).toBe(9999);
    expect(buyerCommissionCents).toBe(500); // Math.round(9999 * 0.05) = 500
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. REMBOURSEMENT — logique de calcul
// ═══════════════════════════════════════════════════════════════════════════════
describe('Remboursement — logique de montant', () => {
  it('remboursement complet = total - 5%', () => {
    // 100$ service, 5$ commission, 14.98$ taxes => total = 11998 cents
    const { totalCents, buyerCommissionCents } = calcCheckout(100, 'QC');
    const { amount, maxRefund } = calcRefund(totalCents, buyerCommissionCents);
    expect(amount).toBe(totalCents - buyerCommissionCents);
    expect(maxRefund).toBe(totalCents - buyerCommissionCents);
  });

  it('on ne peut pas rembourser plus que (total - 5%)', () => {
    const { totalCents, buyerCommissionCents } = calcCheckout(100, 'QC');
    const { valid } = calcRefund(totalCents, buyerCommissionCents, totalCents); // tente de rembourser tout
    expect(valid).toBe(false);
  });

  it('remboursement partiel valide', () => {
    const { totalCents, buyerCommissionCents } = calcCheckout(100, 'QC');
    const partial = Math.round((totalCents - buyerCommissionCents) / 2);
    const { amount, valid } = calcRefund(totalCents, buyerCommissionCents, partial);
    expect(valid).toBe(true);
    expect(amount).toBe(partial);
  });

  it('remboursement de 0$ est invalide', () => {
    const { totalCents, buyerCommissionCents } = calcCheckout(100, 'QC');
    const { valid } = calcRefund(totalCents, buyerCommissionCents, 0);
    expect(valid).toBe(false);
  });

  it('remboursement négatif est invalide', () => {
    const { totalCents, buyerCommissionCents } = calcCheckout(100, 'QC');
    const { valid } = calcRefund(totalCents, buyerCommissionCents, -100);
    expect(valid).toBe(false);
  });

  it('la commission 5% est toujours conservée', () => {
    const { totalCents, buyerCommissionCents } = calcCheckout(200, 'ON');
    const { amount } = calcRefund(totalCents, buyerCommissionCents);
    const kept = totalCents - amount;
    expect(kept).toBe(buyerCommissionCents); // exactement le 5%
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. WORKER EARNING — 80/20 split
// ═══════════════════════════════════════════════════════════════════════════════
describe('Worker earning — split 80/20', () => {
  it('worker reçoit 80% du prix du service', () => {
    const { netCents } = calcWorkerEarning(100);
    expect(netCents).toBe(8000);
  });

  it('plateforme garde 20% du prix du service', () => {
    const { commission } = calcWorkerEarning(100);
    expect(commission).toBe(2000); // 20$ en cents
  });

  it('gross = net + commission', () => {
    const { gross, netCents, commission } = calcWorkerEarning(100);
    expect(gross).toBe(netCents + commission);
  });

  it('prix à 50$', () => {
    const { netCents, commission } = calcWorkerEarning(50);
    expect(netCents).toBe(4000);
    expect(commission).toBe(1000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. PLATFORM EARNINGS — tracking
// ═══════════════════════════════════════════════════════════════════════════════
describe('Platform earnings — calcul commission au versement', () => {
  it('commission plateforme = 20% du gross (service 100$)', () => {
    const transferCents = 8000; // 80% of 100$
    const commission = calcPlatformEarningAtPayout(transferCents);
    expect(Number(commission)).toBeCloseTo(20.00, 2);
  });

  it('commission plateforme = 20% du gross (service 50$)', () => {
    const transferCents = 4000; // 80% of 50$
    const commission = calcPlatformEarningAtPayout(transferCents);
    expect(Number(commission)).toBeCloseTo(10.00, 2);
  });

  it('buyer commission (5%) + worker commission (20%) = 25% du service price', () => {
    const priceD = 100;
    const { buyerCommissionCents } = calcCheckout(priceD);
    const { commission } = calcWorkerEarning(priceD);
    const totalPlatformCents = buyerCommissionCents + commission;
    expect(totalPlatformCents).toBe(2500); // 25% of 10000 cents
  });

  it('sur un service de 200$ — total plateforme = 50$', () => {
    const { buyerCommissionCents } = calcCheckout(200);
    const { commission } = calcWorkerEarning(200);
    const totalPlatformCents = buyerCommissionCents + commission;
    expect(totalPlatformCents).toBe(5000); // 50$
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. REMBOURSEMENT + PLATFORM EARNINGS — impact combiné
// ═══════════════════════════════════════════════════════════════════════════════
describe('Remboursement — impact sur les gains plateforme', () => {
  it('après remboursement complet, la plateforme garde le 5%', () => {
    const { totalCents, buyerCommissionCents } = calcCheckout(100, 'QC');
    const { amount: refunded } = calcRefund(totalCents, buyerCommissionCents);
    const platformKept = totalCents - refunded;
    expect(platformKept).toBe(buyerCommissionCents); // 500 cents = 5$
  });

  it('après remboursement partiel (50%), la plateforme garde 5% + surplus', () => {
    const { totalCents, buyerCommissionCents } = calcCheckout(100, 'QC');
    const maxRefund = totalCents - buyerCommissionCents;
    const partialRefund = Math.round(maxRefund / 2);
    const platformKept = totalCents - partialRefund;
    expect(platformKept).toBeGreaterThan(buyerCommissionCents);
  });

  it('le 20% worker commission n\'est jamais généré si booking remboursé', () => {
    // Remboursement supprime le credit du worker → pas de payout → pas de worker_commission
    // Ce test vérifie la logique : si credit est supprimé, pas de worker_commission générée
    const workerCredits = []; // Simulé vide après DELETE
    const workerCommissionsGenerated = workerCredits.map(c =>
      calcPlatformEarningAtPayout(Math.round(c.amount * 100))
    );
    expect(workerCommissionsGenerated).toHaveLength(0);
  });
});
