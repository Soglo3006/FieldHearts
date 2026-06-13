import pool from "../config/db.js";
import stripe from "../config/stripe.js";
import { createLocalizedNotification } from "../services/notificationService.js";

import { resolveDepositBaseAmount } from "../utils/depositSchema.js";

function roundCents(value) {
  return Math.round(Number(value) || 0);
}

function roundDollars(value) {
  return Number((Number(value) || 0).toFixed(2));
}

/**
 * Client cancels a paid active booking when listing had a deposit.
 * Client refund = (service price - deposit) + proportional taxes.
 * Worker keeps 80% of deposit base; platform keeps 20% + buyer fee.
 */
export async function processDepositCancellationRefund({ bookingId, cancelledByUserId }) {
  const result = await pool.query(
    `SELECT b.*, p.id AS payment_id, p.stripe_payment_intent_id, p.platform_fee, p.amount AS payment_amount,
            s.title AS service_title, s.pricing_mode, s.price, s.price_max, s.estimated_hours AS service_estimated_hours,
            s.deposit_enabled,
            CASE WHEN uw.account_type = 'company' THEN uw.company_name ELSE uw.full_name END AS worker_name,
            CASE WHEN uc.account_type = 'company' THEN uc.company_name ELSE uc.full_name END AS client_name
     FROM bookings b
     JOIN services s ON s.id = b.service_id
     JOIN users uw ON uw.id = b.worker_id
     JOIN users uc ON uc.id = b.client_id
     JOIN payments p ON p.booking_id = b.id AND p.status = 'paid'
     WHERE b.id = $1
     ORDER BY p.created_at DESC
     LIMIT 1`,
    [bookingId]
  );

  if (result.rows.length === 0) {
    const err = new Error("No paid booking found");
    err.statusCode = 404;
    throw err;
  }

  const row = result.rows[0];

  if (row.client_id !== cancelledByUserId) {
    const err = new Error("Only the client can cancel with deposit policy");
    err.statusCode = 403;
    throw err;
  }

  if (row.status !== "active" || row.payment_status !== "paid") {
    const err = new Error("Only active paid bookings can be cancelled this way");
    err.statusCode = 400;
    throw err;
  }

  const depositCents = roundCents(row.deposit_amount_cents);
  if (!row.deposit_enabled || depositCents <= 0) {
    const err = new Error("This booking has no deposit policy");
    err.statusCode = 400;
    throw err;
  }

  const baseAmount = resolveDepositBaseAmount(
    {
      pricing_mode: row.pricing_mode,
      price: row.price,
      price_max: row.price_max,
      estimated_hours: row.estimated_hours ?? row.service_estimated_hours,
    },
    row,
  );
  const servicePriceCents = roundCents((baseAmount ?? Number(row.custom_price ?? row.price)) * 100);
  const taxRate = Number(row.tax_rate) || 0;
  const refundBaseCents = Math.max(0, servicePriceCents - depositCents);
  const refundTaxesCents = roundCents(refundBaseCents * taxRate);
  const totalClientRefundCents = refundBaseCents + refundTaxesCents;

  const workerDepositCents = roundCents(depositCents * 0.8);

  if (totalClientRefundCents > 0) {
    await stripe.refunds.create({
      payment_intent: row.stripe_payment_intent_id,
      amount: totalClientRefundCents,
    });
  }

  await pool.query(
    `UPDATE payments SET status = 'refunded', updated_at = NOW() WHERE id = $1`,
    [row.payment_id]
  );

  await pool.query(
    `UPDATE bookings SET status = 'cancelled', payment_status = 'refunded' WHERE id = $1`,
    [bookingId]
  );

  if (workerDepositCents > 0) {
    await pool.query(
      `INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
      [row.worker_id]
    );
    const workerDepositDollars = roundDollars(workerDepositCents / 100);
    await pool.query(
      `UPDATE wallets SET balance = balance + $1, total_earned = total_earned + $1, updated_at = NOW()
       WHERE user_id = $2`,
      [workerDepositDollars, row.worker_id]
    );
    await pool.query(
      `INSERT INTO transactions (user_id, booking_id, type, amount, description, other_user_name, listing_title)
       VALUES ($1, $2, 'credit', $3, 'Dépôt retenu — annulation client', $4, $5)`,
      [row.worker_id, bookingId, workerDepositDollars, row.client_name, row.service_title]
    );
  }

  await pool.query(
    `UPDATE calendar_events SET status = 'cancelled', updated_at = NOW()
     WHERE booking_id = $1 AND status = 'scheduled'`,
    [bookingId]
  );

  createLocalizedNotification({
    userId: row.worker_id,
    type: "booking_cancelled",
    link: "/bookings",
    en: {
      title: "Booking cancelled",
      body: `${row.client_name} cancelled "${row.service_title}". The deposit was retained.`,
    },
    fr: {
      title: "Réservation annulée",
      body: `${row.client_name} a annulé « ${row.service_title} ». Le dépôt a été retenu.`,
    },
  }).catch(() => {});

  return {
    refund_cents: totalClientRefundCents,
    deposit_retained_cents: depositCents,
    worker_deposit_cents: workerDepositCents,
  };
}
