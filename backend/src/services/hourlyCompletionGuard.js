import pool from "../config/db.js";
import { normalizePricingMode } from "../utils/servicePricing.js";
import { ensureDepositsAndCalendarSchema, resolveBookingDepositMeta } from "../utils/depositSchema.js";
import {
  computeBalanceDueCents,
  isHourlyBooking,
  isWorkBasedBooking,
  isWorkBasedPricingMode,
  usesSplitDepositPayment,
} from "../utils/hourlyPayment.js";

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

async function loadBookingForPaymentGuard(bookingId) {
  const bookingResult = await pool.query(
    `SELECT b.*, s.title AS service_title, s.price AS service_price,
            COALESCE(b.pricing_mode, s.pricing_mode) AS pricing_mode,
            s.price_max, s.estimated_hours AS service_estimated_hours,
            s.deposit_enabled AS service_deposit_enabled,
            s.deposit_type AS service_deposit_type,
            s.deposit_value AS service_deposit_value
     FROM bookings b
     JOIN services s ON s.id = b.service_id
     WHERE b.id = $1`,
    [bookingId],
  );
  const row = bookingResult.rows[0];
  if (!row) return null;
  return {
    ...row,
    price: row.custom_price ?? row.service_price,
  };
}

function serviceMetaFromRow(row) {
  const deposit = resolveBookingDepositMeta(row);
  return {
    pricing_mode: row.pricing_mode,
    price: row.price ?? row.service_price,
    price_max: row.price_max,
    estimated_hours: row.estimated_hours ?? row.service_estimated_hours,
    ...deposit,
  };
}

/**
 * Blocks completion when split-deposit balance is unpaid or hourly sessions pending.
 * @throws {{ statusCode: number, message: string, code?: string }}
 */
export async function assertHourlyReadyForCompletion(bookingId, pricingMode) {
  const mode = normalizePricingMode(pricingMode);
  if (mode !== "hourly" && !isWorkBasedPricingMode(mode)) return;

  await ensureDepositsAndCalendarSchema(pool);

  const row = await loadBookingForPaymentGuard(bookingId);
  if (!row) return;

  const meta = serviceMetaFromRow(row);
  const splitDeposit = usesSplitDepositPayment(row, meta);

  if (mode === "hourly") {
    await autoApproveStaleSessions(bookingId);
    const refreshed = await loadBookingForPaymentGuard(bookingId);
    if (!refreshed) return;
    Object.assign(row, refreshed);
  }

  const balanceDue = Number(row.balance_due_cents) || computeBalanceDueCents(row, meta);

  if (splitDeposit && row.payment_status === "deposit_paid") {
    if (isHourlyBooking(row)) {
      const approvedHours = Number(row.approved_hours_total) || 0;
      if (approvedHours <= 0) {
        const err = new Error(
          "Hourly bookings require approved work hours before completion",
        );
        err.statusCode = 400;
        err.code = "HOURLY_NO_APPROVED_HOURS";
        throw err;
      }
    }

    if (balanceDue > 0) {
      const err = new Error(
        isWorkBasedBooking(row)
          ? "The remaining balance must be paid before completion"
          : "Hourly bookings require the approved-hours balance to be paid before completion",
      );
      err.statusCode = 400;
      err.code = "HOURLY_BALANCE_DUE";
      err.balance_due_cents = balanceDue;
      throw err;
    }
  }

  if (!isHourlyBooking(row)) return;

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
