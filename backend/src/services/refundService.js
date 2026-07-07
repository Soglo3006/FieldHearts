import pool from "../config/db.js";
import {
  WORKER_COMMISSION_RATE,
  workerNetFromGross,
} from "../utils/commissionRates.js";
import stripe from "../config/stripe.js";

function createRefundError(statusCode, message, extra = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.payload = { message, ...extra };
  return error;
}

function roundCents(value) {
  return Math.round(Number(value) || 0);
}

function roundDollars(value) {
  return Number((Number(value) || 0).toFixed(2));
}

/**
 * Returns refund summary based on base price only.
 * Buyer fee (5%) is never refundable.
 * Taxes are refunded proportionally on top of the base refund.
 * Min refund: 50% of base. Max refund: 100% of base (+ proportional taxes).
 */
export function buildRefundSummary(paymentRow, servicePrice) {
  if (!paymentRow) return null;

  const basePriceCents = roundCents(Number(servicePrice) * 100);
  const platformFeeCents = roundCents(paymentRow.platform_fee); // 5% buyer fee, never refunded

  return {
    base_price_cents: basePriceCents,
    platform_fee_cents: platformFeeCents,
    min_percentage: 50,
    max_percentage: 100,
  };
}

/**
 * Process a booking refund based on a percentage of the base price.
 * - refundPercentage: 50–100 (% of base price to refund)
 * - Client receives: base × % + taxes × %
 * - Worker loses: base × % × worker net share
 * - Platform loses: base × % × worker commission rate + taxes × %
 * - Buyer fee (5%): always kept by platform
 */
export async function processBookingRefund({ bookingId, refundPercentage, cancelBooking = false }) {
  const paymentResult = await pool.query(
    `SELECT p.*, b.client_id, b.worker_id, b.status AS booking_status, b.tax_rate,
            COALESCE(b.custom_price, s.price) AS service_price,
            s.title AS service_title,
            CASE WHEN uc.account_type = 'company' THEN uc.company_name ELSE uc.full_name END AS client_name,
            CASE WHEN uw.account_type = 'company' THEN uw.company_name ELSE uw.full_name END AS worker_name
     FROM payments p
     JOIN bookings b ON b.id = p.booking_id
     JOIN services s ON s.id = b.service_id
     JOIN users uc ON uc.id = b.client_id
     JOIN users uw ON uw.id = b.worker_id
     WHERE p.booking_id = $1
       AND p.status IN ('paid', 'transferred')
     ORDER BY p.created_at DESC
     LIMIT 1`,
    [bookingId]
  );

  if (paymentResult.rows.length === 0) {
    throw createRefundError(404, "No eligible payment found for this booking");
  }

  const payment = paymentResult.rows[0];

  if (!payment.stripe_payment_intent_id) {
    throw createRefundError(400, "No Stripe payment intent found for this booking");
  }

  const pct = Math.max(50, Math.min(100, Number(refundPercentage))) / 100;
  const basePriceCents = roundCents(Number(payment.service_price) * 100);
  const taxRate = Number(payment.tax_rate) || 0;

  if (basePriceCents <= 0) {
    throw createRefundError(400, "Invalid base price for this booking");
  }

  // Amounts
  const refundBaseCents = roundCents(basePriceCents * pct);
  const refundTaxesCents = roundCents(refundBaseCents * taxRate);
  const totalClientRefundCents = refundBaseCents + refundTaxesCents;

  const workerReversalCents = roundCents(workerNetFromGross(refundBaseCents / 100) * 100);
  const platformCommissionLossCents = roundCents(refundBaseCents * WORKER_COMMISSION_RATE);

  // 1. Reverse part of worker's transfer if it exists
  if (payment.stripe_transfer_id && workerReversalCents > 0) {
    await stripe.transfers.createReversal(payment.stripe_transfer_id, { amount: workerReversalCents });
  }

  // 2. Refund client (base portion + proportional taxes)
  const refund = await stripe.refunds.create({
    payment_intent: payment.stripe_payment_intent_id,
    amount: totalClientRefundCents,
  });

  // 3. Update payment status
  await pool.query(
    "UPDATE payments SET status = 'refunded', updated_at = NOW() WHERE id = $1",
    [payment.id]
  );

  // 4. Update booking
  if (cancelBooking) {
    await pool.query(
      "UPDATE bookings SET payment_status = 'refunded', status = 'cancelled' WHERE id = $1",
      [bookingId]
    );
  } else {
    await pool.query(
      "UPDATE bookings SET payment_status = 'refunded' WHERE id = $1",
      [bookingId]
    );
  }

  // 5. Update client wallet (total_spent reduced by total refund to client)
  const totalClientRefundDollars = roundDollars(totalClientRefundCents / 100);
  await pool.query(
    `UPDATE wallets
     SET total_spent = GREATEST(0, total_spent - $1), updated_at = NOW()
     WHERE user_id = $2`,
    [totalClientRefundDollars, payment.client_id]
  );

  // Record refund as a credit in client's transaction history
  await pool.query(
    `INSERT INTO transactions (user_id, booking_id, type, amount, description, other_user_name, listing_title)
     VALUES ($1, $2, 'credit', $3, 'Remboursement - litige résolu', $4, $5)`,
    [payment.client_id, bookingId, totalClientRefundDollars, payment.worker_name, payment.service_title]
  );

  // 6. Update worker wallet
  if (workerReversalCents > 0) {
    const workerReversalDollars = roundDollars(workerReversalCents / 100);

    await pool.query(
      `UPDATE wallets
       SET balance = GREATEST(0, balance - $1),
           total_earned = GREATEST(0, total_earned - $1),
           updated_at = NOW()
       WHERE user_id = $2`,
      [workerReversalDollars, payment.worker_id]
    );

    // Update worker credit transaction: reduce amount and label it as adjusted
    const creditTx = await pool.query(
      `SELECT id, amount FROM transactions
       WHERE booking_id = $1 AND user_id = $2 AND type = 'credit'
       ORDER BY created_at DESC LIMIT 1`,
      [bookingId, payment.worker_id]
    );
    if (creditTx.rows.length > 0) {
      const remainingAmount = roundDollars(Number(creditTx.rows[0].amount) - workerReversalDollars);
      if (remainingAmount <= 0) {
        await pool.query("DELETE FROM transactions WHERE id = $1", [creditTx.rows[0].id]);
      } else {
        await pool.query(
          `UPDATE transactions SET amount = $1, description = $2 WHERE id = $3`,
          [remainingAmount, `Paiement reçu — ajusté après litige (${Math.round(pct * 100)}% remboursé)`, creditTx.rows[0].id]
        );
      }
    }

    // Adjust platform commission earnings
    if (platformCommissionLossCents > 0) {
      const platformCommissionLossDollars = roundDollars(platformCommissionLossCents / 100);
      await pool.query(
        `UPDATE platform_earnings
         SET amount = GREATEST(0, amount - $2)
         WHERE booking_id = $1 AND type = 'worker_commission'`,
        [bookingId, platformCommissionLossDollars]
      );
      await pool.query(
        `DELETE FROM platform_earnings
         WHERE booking_id = $1 AND type = 'worker_commission' AND amount <= 0`,
        [bookingId]
      );
    }
  }

  return {
    refund_id: refund.id,
    refund_percentage: Math.round(pct * 100),
    refund_base_cents: refundBaseCents,
    refund_taxes_cents: refundTaxesCents,
    total_client_refund_cents: totalClientRefundCents,
    worker_reversal_cents: workerReversalCents,
    platform_commission_loss_cents: platformCommissionLossCents,
  };
}
