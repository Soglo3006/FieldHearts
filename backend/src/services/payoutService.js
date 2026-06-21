import pool from "../config/db.js";
import stripe from "../config/stripe.js";
import { notifyPayoutReceived } from "./emailService.js";
import { createNotification } from "./notificationService.js";

const MIN_BUSINESS_DAYS = 5;             // money must sit 5 business days before payout

// Reference date: Friday, Jan 3 2025 — anchor for bi-weekly cycle
const REFERENCE_FRIDAY = new Date("2025-01-03T16:00:00Z"); // 16:00 UTC = 12:00 EST
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

// ─── Date helpers ─────────────────────────────────────────────────────────────

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Calculate the date that is `days` business days before `from`.
 * Used to determine the eligibility cutoff.
 */
export function subtractBusinessDays(from, days) {
  const result = new Date(from);
  let counted = 0;
  while (counted < days) {
    result.setDate(result.getDate() - 1);
    if (!isWeekend(result)) counted++;
  }
  return result;
}

/**
 * Returns the next payout date (bi-weekly Friday) after `from`.
 */
export function getNextPayoutDate(from = new Date()) {
  const fromMs = from.getTime();
  const refMs = REFERENCE_FRIDAY.getTime();
  const cyclesElapsed = Math.floor((fromMs - refMs) / TWO_WEEKS_MS);
  const nextMs = refMs + (cyclesElapsed + 1) * TWO_WEEKS_MS;
  return new Date(nextMs);
}

/**
 * Returns true if `date` falls on a payout Friday (bi-weekly cycle).
 */
export function isPayoutDay(date = new Date()) {
  if (date.getUTCDay() !== 5) return false; // must be Friday (UTC)
  const diffMs = date.getTime() - REFERENCE_FRIDAY.getTime();
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  return diffWeeks % 2 === 0;
}

// ─── Payout logic ─────────────────────────────────────────────────────────────

/**
 * Process bi-weekly payout for one user.
 * Transfers 80% of eligible service earnings to their Stripe Connect account.
 */
export async function processUserPayout(userId) {
  // Get Stripe Connect account + worker info
  const stripeAccount = await pool.query(
    "SELECT stripe_account_id FROM stripe_accounts WHERE user_id = $1",
    [userId]
  );

  if (stripeAccount.rows.length === 0 || !stripeAccount.rows[0].stripe_account_id) {
    createNotification({
      userId,
      type: "payment",
      title: "Compte bancaire requis",
      body: "Un versement vous est dû mais votre compte Stripe n'est pas configuré. Connectez votre compte dans Portefeuille pour recevoir vos paiements.",
      link: "/wallet",
    }).catch(() => {});
    return null;
  }

  const stripeAccountId = stripeAccount.rows[0].stripe_account_id;

  const workerInfo = await pool.query(
    "SELECT email, CASE WHEN account_type = 'company' THEN company_name ELSE full_name END AS display_name FROM users WHERE id = $1",
    [userId]
  );
  const workerEmail = workerInfo.rows[0]?.email;
  const workerName  = workerInfo.rows[0]?.display_name;
  const eligibilityCutoff = subtractBusinessDays(new Date(), MIN_BUSINESS_DAYS);

  // Find all unpaid worker credit transactions older than MIN_BUSINESS_DAYS business days
  const creditsResult = await pool.query(
    `SELECT t.id AS tx_id, t.amount, t.booking_id, t.created_at,
            (
              SELECT p.stripe_payment_intent_id
              FROM payments p
              WHERE p.booking_id = t.booking_id AND p.status IN ('paid', 'refunded')
              ORDER BY CASE COALESCE(p.payment_kind, 'full')
                WHEN 'balance' THEN 0 WHEN 'full' THEN 1 WHEN 'deposit' THEN 2 ELSE 3 END,
                p.created_at DESC
              LIMIT 1
            ) AS stripe_payment_intent_id
     FROM transactions t
     JOIN bookings b ON b.id = t.booking_id
     WHERE t.user_id = $1
       AND t.type = 'credit'
       AND b.worker_id = $1
       AND b.status = 'completed'
       AND b.payment_status = ANY($3::text[])
       AND EXISTS (
         SELECT 1 FROM payments p
         WHERE p.booking_id = b.id AND p.status IN ('paid', 'refunded')
       )
       AND t.created_at <= $2
     ORDER BY t.created_at ASC`,
    [userId, eligibilityCutoff.toISOString(), ["paid", "refunded", "deposit_paid"]]
  );

  if (creditsResult.rows.length === 0) return null;

  let totalTransferredCents = 0;
  const processedBookings = [];

  for (const row of creditsResult.rows) {
    // Credit amount is already net (price * 0.80) — transfer it as-is
    const transferCents = Math.round(Number(row.amount) * 100);

    // source_transaction requires a charge ID (ch_xxx), not a payment intent ID (pi_xxx).
    // Resolve the PI to its underlying charge before transferring.
    let sourceTransaction = row.stripe_payment_intent_id;
    if (sourceTransaction && sourceTransaction.startsWith("pi_")) {
      try {
        const pi = await stripe.paymentIntents.retrieve(sourceTransaction);
        const chargeId = typeof pi.latest_charge === "object"
          ? pi.latest_charge?.id
          : pi.latest_charge;
        if (chargeId) sourceTransaction = chargeId;
      } catch (piErr) {
        console.error(`[Payout] Could not resolve charge for PI ${sourceTransaction}:`, piErr.message);
      }
    }

    try {
      await stripe.transfers.create({
        amount: transferCents,
        currency: "cad",
        destination: stripeAccountId,
        source_transaction: sourceTransaction,
        description: `Versement bi-mensuel — réservation ${row.booking_id}`,
      });

      // Mark booking + payment as transferred
      await pool.query(
        "UPDATE bookings SET payment_status = 'transferred' WHERE id = $1",
        [row.booking_id]
      );
      await pool.query(
        "UPDATE payments SET status = 'transferred', updated_at = NOW() WHERE booking_id = $1 AND status IN ('paid', 'refunded')",
        [row.booking_id]
      );

      // ── Record platform's 20% worker commission ──────────────────────────
      // transferCents = 80% → gross was transferCents / 0.80, commission = gross * 0.20
      const workerCommission = ((transferCents / 0.80) * 0.20 / 100).toFixed(2);
      await pool.query(
        `INSERT INTO platform_earnings (booking_id, type, amount, description)
         VALUES ($1, 'worker_commission', $2, 'Commission vendeur 20% au versement')`,
        [row.booking_id, workerCommission]
      );

      totalTransferredCents += transferCents;
      processedBookings.push(row.booking_id);
    } catch (err) {
      console.error(`[Payout] Transfer failed for booking ${row.booking_id}:`, err.message);
    }
  }

  if (processedBookings.length === 0) return null;

  const totalTransferredDollars = (totalTransferredCents / 100);

  // Deduct payout amount from wallet balance
  await pool.query(
    `UPDATE wallets
     SET balance = GREATEST(0, balance - $1), updated_at = NOW()
     WHERE user_id = $2`,
    [totalTransferredDollars, userId]
  );

  // Record the payout debit transaction
  await pool.query(
    `INSERT INTO transactions (user_id, type, amount, description)
     VALUES ($1, 'debit', $2, 'Versement bi-mensuel automatique')`,
    [userId, totalTransferredDollars]
  );

  const transferredDollars = totalTransferredDollars.toFixed(2);
  const grossDollars = (totalTransferredDollars / 0.80).toFixed(2);
  const commissionDollars = (Number(grossDollars) - totalTransferredDollars).toFixed(2);
  const nextPayout = getNextPayoutDate(new Date()).toLocaleDateString("fr-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });


  if (workerEmail) {
    notifyPayoutReceived(workerEmail, workerName, transferredDollars, commissionDollars, grossDollars, processedBookings.length, nextPayout)
      .catch((err) => console.error("[Payout] Email failed:", err.message));
  }

  return {
    transferred_cents: totalTransferredCents,
    commission_cents: 0,
    bookings_count: processedBookings.length,
  };
}

/**
 * Recover any completed bookings whose credit transaction was never inserted
 * (e.g. finalizeCompletion failed silently due to a DB hiccup).
 * Safe to call multiple times — guarded by NOT EXISTS.
 */
async function recoverMissingCredits() {
  // Find completed+paid bookings with no credit transaction and insert them
  const missing = await pool.query(
    `SELECT b.id, b.worker_id, b.client_id,
            COALESCE(b.custom_price, s.price) * 0.80 AS worker_receives,
            s.title,
            CASE WHEN uc.account_type = 'company' THEN uc.company_name ELSE uc.full_name END AS client_name
     FROM bookings b
     JOIN services s ON b.service_id = s.id
     JOIN users uc ON b.client_id = uc.id
     WHERE b.status = 'completed'
       AND b.payment_status = 'paid'
       AND NOT EXISTS (
         SELECT 1 FROM transactions t WHERE t.booking_id = b.id AND t.type = 'credit'
       )`
  );

  if (missing.rows.length === 0) return;


  for (const row of missing.rows) {
    try {
      await pool.query(
        `INSERT INTO transactions (user_id, booking_id, type, amount, description, other_user_name, listing_title)
         VALUES ($1, $2, 'credit', $3, 'Paiement reçu pour travail complété', $4, $5)`,
        [row.worker_id, row.id, row.worker_receives, row.client_name, row.title]
      );
      await pool.query(
        `INSERT INTO wallets (user_id, balance, total_earned)
         VALUES ($1, $2, $2)
         ON CONFLICT (user_id) DO UPDATE
         SET balance = wallets.balance + $2, total_earned = wallets.total_earned + $2, updated_at = NOW()`,
        [row.worker_id, row.worker_receives]
      );
    } catch (err) {
      console.error(`[Payout] Failed to recover credit for booking ${row.id}:`, err.message);
    }
  }
}

/**
 * Process bi-weekly payouts for all eligible workers.
 */
export async function processAllPayouts() {

  // Recover any bookings where finalizeCompletion failed silently
  await recoverMissingCredits().catch((err) =>
    console.error("[Payout] recoverMissingCredits failed:", err.message)
  );

  const eligibilityCutoff = subtractBusinessDays(new Date(), MIN_BUSINESS_DAYS);

  const workers = await pool.query(
    `SELECT DISTINCT t.user_id
     FROM transactions t
     JOIN bookings b ON b.id = t.booking_id
     WHERE t.type = 'credit'
       AND b.worker_id = t.user_id
       AND b.status = 'completed'
       AND b.payment_status = ANY($2::text[])
       AND EXISTS (
         SELECT 1 FROM payments p
         WHERE p.booking_id = b.id AND p.status IN ('paid', 'refunded')
       )
       AND t.created_at <= $1`,
    [eligibilityCutoff.toISOString(), ["paid", "refunded", "deposit_paid"]]
  );

  let processed = 0;
  for (const { user_id } of workers.rows) {
    try {
      const result = await processUserPayout(user_id);
      if (result) processed++;
    } catch (err) {
      console.error(`[Payout] Error for user ${user_id}:`, err.message);
    }
  }

}
