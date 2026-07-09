import pool from "../config/db.js";
import { finalizeCompletion } from "../controllers/bookingController.js";
import { notifyPaymentReceipt } from "./emailService.js";
import { getUserLang } from "./notificationService.js";
import { ensureDepositsAndCalendarSchema } from "../utils/depositSchema.js";
import {
  computeBalanceDueCents,
} from "../utils/hourlyPayment.js";
import { BUYER_COMMISSION_RATE } from "../utils/commissionRates.js";
import { recordClientPaymentLedger } from "./ledgerService.js";

const CHECKOUT_TX_DESCRIPTION = {
  full: "Payment for service",
  deposit: "Dépôt — réservation",
  balance: "Solde — prestation",
};

function serviceMetaFromBookingRow(row) {
  return {
    pricing_mode: row.pricing_mode ?? row.service_pricing_mode,
    price: row.price ?? row.service_price,
    price_max: row.price_max,
    estimated_hours: row.estimated_hours ?? row.service_estimated_hours,
    deposit_enabled: row.service_deposit_enabled ?? row.deposit_enabled,
    deposit_type: row.service_deposit_type ?? row.deposit_type,
    deposit_value: row.service_deposit_value ?? row.deposit_value,
  };
}

function computeBalanceDueAfterDeposit(bookingRow, newPaidBase) {
  const meta = serviceMetaFromBookingRow(bookingRow);
  return computeBalanceDueCents(
    { ...bookingRow, paid_service_base_cents: newPaidBase, balance_due_cents: 0 },
    meta,
  );
}

async function loadBookingForHourlyPayment(bookingId) {
  const result = await pool.query(
    `SELECT b.*, s.title, s.price AS service_price, s.pricing_mode AS service_pricing_mode,
            s.price_max, s.estimated_hours AS service_estimated_hours,
            s.deposit_enabled AS service_deposit_enabled,
            s.deposit_type AS service_deposit_type,
            s.deposit_value AS service_deposit_value,
            CASE WHEN uc.account_type = 'company' THEN uc.company_name ELSE uc.full_name END AS client_name
     FROM bookings b
     JOIN services s ON s.id = b.service_id
     JOIN users uc ON uc.id = b.client_id
     WHERE b.id = $1`,
    [bookingId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    ...row,
    price: row.custom_price ?? row.service_price,
    pricing_mode: row.pricing_mode ?? row.service_pricing_mode,
  };
}

/**
 * Apply successful payment to booking, transactions, platform earnings, and ledger.
 * Used by Checkout Session webhook and PaymentIntent webhook.
 */
export async function applySuccessfulPayment({
  bookingId,
  paymentIntentId,
  checkoutSessionId = null,
  paymentKind,
  paidServiceCents,
  totalAmountCents,
  buyerCommissionCents = 0,
  taxesCents = 0,
}) {
  await ensureDepositsAndCalendarSchema(pool);

  if (paymentIntentId) {
    if (checkoutSessionId) {
      await pool.query(
        `UPDATE payments
         SET status = 'paid', stripe_payment_intent_id = $1, updated_at = NOW()
         WHERE stripe_checkout_session_id = $2`,
        [paymentIntentId, checkoutSessionId],
      );
    } else {
      await pool.query(
        `UPDATE payments
         SET status = 'paid', updated_at = NOW()
         WHERE stripe_payment_intent_id = $1 AND booking_id = $2`,
        [paymentIntentId, bookingId],
      );
    }
  }

  const bookingRow = await loadBookingForHourlyPayment(bookingId);
  const prevPaidBase = Number(bookingRow?.paid_service_base_cents || 0);
  const newPaidBase = prevPaidBase + paidServiceCents;
  const balanceDueCents = bookingRow
    ? computeBalanceDueAfterDeposit(bookingRow, newPaidBase)
    : 0;

  if (paymentKind === "deposit") {
    await pool.query(
      `UPDATE bookings
       SET payment_status = 'deposit_paid',
           status = 'active',
           paid_service_base_cents = $2,
           balance_due_cents = $3
       WHERE id = $1 AND status IN ('accepted', 'active')`,
      [bookingId, newPaidBase, balanceDueCents],
    );
  } else if (paymentKind === "balance") {
    const nextPaymentStatus = balanceDueCents <= 0 ? "paid" : "deposit_paid";
    await pool.query(
      `UPDATE bookings
       SET paid_service_base_cents = $2,
           balance_due_cents = $3,
           payment_status = $4
       WHERE id = $1`,
      [bookingId, newPaidBase, balanceDueCents, nextPaymentStatus],
    );
  } else {
    await pool.query(
      `UPDATE bookings
       SET payment_status = 'paid',
           status = 'active',
           paid_service_base_cents = CASE
             WHEN $2 > 0 THEN paid_service_base_cents + $2
             ELSE paid_service_base_cents
           END,
           balance_due_cents = 0
       WHERE id = $1 AND status = 'accepted'`,
      [bookingId, paidServiceCents],
    );
  }

  const payoutBooking = await loadBookingForHourlyPayment(bookingId);
  if (payoutBooking?.status === "completed" && payoutBooking.payment_status === "paid") {
    await finalizeCompletion(payoutBooking).catch((err) =>
      console.error("Finalize completion after payment failed for booking", bookingId, err.message),
    );
  }

  const paymentFilter = checkoutSessionId
    ? "p.stripe_checkout_session_id = $2"
    : "p.stripe_payment_intent_id = $2";

  const booking = await pool.query(
    `SELECT b.client_id, b.worker_id, p.amount, p.payment_kind, s.title, s.image_url, s.image_urls,
            CASE WHEN uw.account_type = 'company' THEN uw.company_name ELSE uw.full_name END AS worker_name,
            CASE WHEN uc.account_type = 'company' THEN uc.company_name ELSE uc.full_name END AS client_name,
            uc.email AS client_email
     FROM bookings b
     JOIN services s ON b.service_id = s.id
     JOIN users uw ON b.worker_id = uw.id
     JOIN users uc ON b.client_id = uc.id
     JOIN payments p ON p.booking_id = b.id AND ${paymentFilter}
     WHERE b.id = $1`,
    [bookingId, checkoutSessionId ?? paymentIntentId],
  );

  if (booking.rows.length === 0) return;

  const {
    client_id,
    amount,
    payment_kind: dbPaymentKind,
    title,
    image_url,
    image_urls,
    worker_name,
    client_name,
    client_email,
  } = booking.rows[0];
  const kind = dbPaymentKind || paymentKind;
  const amountDollars = (amount / 100).toFixed(2);
  const txDescription = CHECKOUT_TX_DESCRIPTION[kind] || CHECKOUT_TX_DESCRIPTION.full;

  const existing = await pool.query(
    `SELECT id FROM transactions
     WHERE booking_id = $1 AND type = 'debit' AND description = $2`,
    [bookingId, txDescription],
  );
  if (existing.rows.length === 0) {
    await pool.query(
      `INSERT INTO transactions (user_id, booking_id, type, amount, description, other_user_name, listing_title)
       VALUES ($1, $2, 'debit', $3, $4, $5, $6)`,
      [client_id, bookingId, amountDollars, txDescription, worker_name, title],
    );
    await pool.query(
      `INSERT INTO wallets (user_id, balance, total_spent)
       VALUES ($1, 0, $2)
       ON CONFLICT (user_id) DO UPDATE
       SET total_spent = wallets.total_spent + $2`,
      [client_id, amountDollars],
    );
    const clientLang = await getUserLang(client_id);
    notifyPaymentReceipt(
      client_email, client_name, title, amountDollars, worker_name, bookingId, image_url, image_urls, clientLang,
    );
  }

  const servicePriceCents = paidServiceCents;
  if (servicePriceCents > 0 && paymentKind !== "deposit") {
    const buyerCommission = (Math.round(servicePriceCents * BUYER_COMMISSION_RATE) / 100).toFixed(2);
    await pool.query(
      `INSERT INTO platform_earnings (booking_id, type, amount, description)
       VALUES ($1, 'buyer_commission', $2, 'Commission acheteur 5% — ' || $3)
       ON CONFLICT (booking_id, type) DO UPDATE
       SET amount = (platform_earnings.amount::numeric + EXCLUDED.amount::numeric)::numeric(10,2)`,
      [bookingId, buyerCommission, title],
    );
  }

  await recordClientPaymentLedger({
    bookingId,
    clientId: client_id,
    paymentIntentId,
    totalCents: totalAmountCents ?? amount,
    servicePriceCents,
    buyerCommissionCents: buyerCommissionCents || Math.round(servicePriceCents * BUYER_COMMISSION_RATE),
    taxesCents,
    paymentKind: kind,
    title,
  });
}

export async function completeCheckoutPayment(session) {
  const bookingId = session.metadata?.booking_id;
  if (!bookingId) return;

  const paymentIntentId = session.payment_intent;
  const paymentRow = await pool.query(
    `SELECT payment_kind, deposit_amount_cents, amount
     FROM payments WHERE stripe_checkout_session_id = $1`,
    [session.id],
  );
  const paymentKind =
    session.metadata?.payment_kind || paymentRow.rows[0]?.payment_kind || "full";
  const metaServiceCents = session.metadata?.service_price_cents;
  let paidServiceCents =
    metaServiceCents != null && metaServiceCents !== ""
      ? Number(metaServiceCents)
      : NaN;
  if (!Number.isFinite(paidServiceCents) && paymentRow.rows[0]) {
    paidServiceCents =
      Number(paymentRow.rows[0].deposit_amount_cents) ||
      Number(paymentRow.rows[0].amount) ||
      0;
  } else if (!Number.isFinite(paidServiceCents)) {
    paidServiceCents = 0;
  }

  const buyerCommissionCents = Number(session.metadata?.buyer_commission_cents ?? 0);
  const taxesCents = Number(session.metadata?.taxes_cents ?? 0);
  const totalAmountCents = Number(session.metadata?.total_cents ?? paymentRow.rows[0]?.amount ?? 0);

  await applySuccessfulPayment({
    bookingId,
    paymentIntentId,
    checkoutSessionId: session.id,
    paymentKind,
    paidServiceCents,
    totalAmountCents,
    buyerCommissionCents,
    taxesCents,
  });
}

export async function completePaymentFromIntent(paymentIntent) {
  const bookingId = paymentIntent.metadata?.booking_id;
  if (!bookingId) return;

  const paymentKind = paymentIntent.metadata?.payment_kind || "full";
  const paidServiceCents = Number(paymentIntent.metadata?.service_price_cents ?? 0);
  const buyerCommissionCents = Number(paymentIntent.metadata?.buyer_commission_cents ?? 0);
  const taxesCents = Number(paymentIntent.metadata?.taxes_cents ?? 0);
  const totalAmountCents = paymentIntent.amount_received || paymentIntent.amount;

  await applySuccessfulPayment({
    bookingId,
    paymentIntentId: paymentIntent.id,
    paymentKind,
    paidServiceCents,
    totalAmountCents,
    buyerCommissionCents,
    taxesCents,
  });
}
