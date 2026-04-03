import pool from "../config/db.js";
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

export function buildRefundSummary(paymentRow) {
  if (!paymentRow) return null;

  const totalCents = roundCents(paymentRow.amount);
  const platformFeeCents = roundCents(paymentRow.platform_fee);
  const maxRefundCents = Math.max(0, totalCents - platformFeeCents);

  return {
    total_cents: totalCents,
    platform_fee_cents: platformFeeCents,
    max_refund_cents: maxRefundCents,
    default_refund_cents: maxRefundCents,
  };
}

export async function processBookingRefund({ bookingId, refundAmountCents, cancelBooking = false }) {
  const paymentResult = await pool.query(
    `SELECT p.*, b.client_id, b.worker_id, b.status AS booking_status,
            COALESCE(b.custom_price, s.price) AS service_price
     FROM payments p
     JOIN bookings b ON b.id = p.booking_id
     JOIN services s ON s.id = b.service_id
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

  const refundSummary = buildRefundSummary(payment);
  const maxRefundCents = refundSummary.max_refund_cents;

  if (maxRefundCents <= 0) {
    throw createRefundError(400, "Nothing to refund after deducting platform fee");
  }

  let amountToRefundCents = maxRefundCents;
  if (refundAmountCents !== undefined) {
    const requested = roundCents(refundAmountCents);
    if (requested <= 0 || requested > maxRefundCents) {
      throw createRefundError(
        400,
        `Refund amount must be between 1 and ${maxRefundCents} cents (total minus 5% fee)`,
        { max_refund_cents: maxRefundCents }
      );
    }
    amountToRefundCents = requested;
  }

  const refundRatio = amountToRefundCents / maxRefundCents;
  const servicePriceCents = roundCents(Number(payment.service_price) * 100);
  const workerCreditFullCents = roundCents(servicePriceCents * 0.8);
  const workerCommissionFullCents = roundCents(servicePriceCents * 0.2);
  const workerReversalCents = Math.min(workerCreditFullCents, roundCents(workerCreditFullCents * refundRatio));
  const workerCommissionReversalCents = Math.min(
    workerCommissionFullCents,
    roundCents(workerCommissionFullCents * refundRatio)
  );

  if (payment.stripe_transfer_id && workerReversalCents > 0) {
    await stripe.transfers.createReversal(payment.stripe_transfer_id, { amount: workerReversalCents });
  }

  const refund = await stripe.refunds.create({
    payment_intent: payment.stripe_payment_intent_id,
    amount: amountToRefundCents,
  });

  await pool.query(
    "UPDATE payments SET status = 'refunded', updated_at = NOW() WHERE id = $1",
    [payment.id]
  );

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

  const refundedAmountDollars = roundDollars(amountToRefundCents / 100);
  await pool.query(
    `UPDATE wallets
     SET total_spent = GREATEST(0, total_spent - $1), updated_at = NOW()
     WHERE user_id = $2`,
    [refundedAmountDollars, payment.client_id]
  );

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

    const creditTx = await pool.query(
      `SELECT id, amount
       FROM transactions
       WHERE booking_id = $1 AND type = 'credit'
       ORDER BY created_at DESC
       LIMIT 1`,
      [bookingId]
    );

    if (creditTx.rows.length > 0) {
      const remainingAmount = roundDollars(Number(creditTx.rows[0].amount) - workerReversalDollars);
      if (remainingAmount <= 0) {
        await pool.query("DELETE FROM transactions WHERE id = $1", [creditTx.rows[0].id]);
      } else {
        await pool.query(
          "UPDATE transactions SET amount = $1 WHERE id = $2",
          [remainingAmount, creditTx.rows[0].id]
        );
      }
    }

    if (workerCommissionReversalCents > 0) {
      const workerCommissionReversalDollars = roundDollars(workerCommissionReversalCents / 100);
      await pool.query(
        `UPDATE platform_earnings
         SET amount = GREATEST(0, amount - $2)
         WHERE booking_id = $1 AND type = 'worker_commission'`,
        [bookingId, workerCommissionReversalDollars]
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
    refunded_amount_cents: amountToRefundCents,
    kept_fee_cents: refundSummary.platform_fee_cents,
    max_refund_cents: maxRefundCents,
    partial: amountToRefundCents < maxRefundCents,
    worker_reversal_cents: workerReversalCents,
  };
}
