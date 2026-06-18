import pool from "../config/db.js";
import { normalizePricingMode } from "../utils/servicePricing.js";
import { ensureDepositsAndCalendarSchema } from "../utils/depositSchema.js";
import { computeHourlyBalanceDueCents } from "../utils/hourlyPayment.js";

const AUTO_APPROVE_MS = 72 * 60 * 60 * 1000;

async function autoApproveStaleSessions(bookingId) {
  const cutoff = new Date(Date.now() - AUTO_APPROVE_MS).toISOString();
  await pool.query(
    `UPDATE work_sessions
     SET status = 'approved',
         hours_final = COALESCE(hours_client, hours_worker),
         updated_at = NOW()
     WHERE booking_id = $1
       AND status = 'pending_worker'
       AND updated_at <= $2`,
    [bookingId, cutoff],
  );
  await pool.query(
    `UPDATE bookings
     SET approved_hours_total = COALESCE(
       (SELECT SUM(hours_final) FROM work_sessions
        WHERE booking_id = $1 AND status = 'approved' AND hours_final IS NOT NULL),
       0
     )
     WHERE id = $1`,
    [bookingId],
  );
}

/**
 * Blocks completion for hourly bookings when work sessions are pending, disputed,
 * or when an approved-hours balance remains unpaid.
 * @throws {{ statusCode: number, message: string, code?: string }}
 */
export async function assertHourlyReadyForCompletion(bookingId, pricingMode) {
  const mode = normalizePricingMode(pricingMode);
  if (mode !== "hourly") return;

  await ensureDepositsAndCalendarSchema(pool);
  await autoApproveStaleSessions(bookingId);

  const bookingResult = await pool.query(
    `SELECT approved_hours_total, paid_service_base_cents, balance_due_cents,
            payment_status, price, pricing_mode
     FROM bookings WHERE id = $1`,
    [bookingId],
  );
  const booking = bookingResult.rows[0];
  if (!booking) return;

  const balanceDue =
    Number(booking.balance_due_cents) || computeHourlyBalanceDueCents(booking);
  if (balanceDue > 0) {
    const err = new Error(
      "Hourly bookings require the approved-hours balance to be paid before completion",
    );
    err.statusCode = 400;
    err.code = "HOURLY_BALANCE_DUE";
    err.balance_due_cents = balanceDue;
    throw err;
  }

  const sessions = await pool.query(
    `SELECT id, status FROM work_sessions WHERE booking_id = $1`,
    [bookingId],
  );

  if (sessions.rows.length === 0) return;

  const blocking = sessions.rows.filter((s) => s.status !== "approved");
  if (blocking.length === 0) return;

  const err = new Error(
    "Hourly bookings require all work sessions to be approved before completion",
  );
  err.statusCode = 400;
  err.code = "HOURLY_SESSIONS_PENDING";
  err.pending_count = blocking.length;
  throw err;
}
