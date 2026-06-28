import pool from "../config/db.js";
import { ensureDepositsAndCalendarSchema, resolveBookingDepositMeta } from "../utils/depositSchema.js";
import {
  computeBalanceDueCents,
  isBalanceCheckoutReady,
  isHourlyBooking,
  usesSplitDepositPayment,
} from "../utils/hourlyPayment.js";
import { createLocalizedNotification } from "./notificationService.js";

/**
 * Recompute balance_due_cents after approved hours change or work marked done.
 */
export async function refreshHourlyBalanceDue(bookingId, { notifyClient = false } = {}) {
  await ensureDepositsAndCalendarSchema(pool);

  const result = await pool.query(
    `SELECT b.*, s.title AS service_title, s.price AS service_price,
            s.pricing_mode AS service_pricing_mode, s.price_max,
            s.estimated_hours AS service_estimated_hours,
            s.deposit_enabled, s.deposit_type, s.deposit_value
     FROM bookings b
     JOIN services s ON s.id = b.service_id
     WHERE b.id = $1`,
    [bookingId],
  );
  if (result.rows.length === 0) return { balance_due_cents: 0 };

  const booking = {
    ...result.rows[0],
    price: result.rows[0].custom_price ?? result.rows[0].service_price,
    pricing_mode: result.rows[0].pricing_mode ?? result.rows[0].service_pricing_mode,
  };

  const meta = {
    pricing_mode: booking.pricing_mode,
    price: booking.price,
    price_max: booking.price_max,
    estimated_hours: booking.estimated_hours ?? booking.service_estimated_hours,
    ...resolveBookingDepositMeta(booking),
  };

  if (!usesSplitDepositPayment(booking, meta)) {
    return { balance_due_cents: 0 };
  }

  const balanceDueCents = computeBalanceDueCents(
    { ...booking, balance_due_cents: 0 },
    meta,
  );
  const prevBalance = Number(booking.balance_due_cents) || 0;

  await pool.query(`UPDATE bookings SET balance_due_cents = $1 WHERE id = $2`, [
    balanceDueCents,
    bookingId,
  ]);

  if (
    notifyClient &&
    balanceDueCents > 0 &&
    balanceDueCents > prevBalance &&
    booking.payment_status === "deposit_paid" &&
    isBalanceCheckoutReady(booking)
  ) {
    const owedDollars = (balanceDueCents / 100).toFixed(2);
    createLocalizedNotification({
      userId: booking.client_id,
      type: "payment",
      link: "/bookings",
      en: {
        title: "Balance due",
        body: `Work on "${booking.service_title}" is ready for balance payment of $${owedDollars}.`,
      },
      fr: {
        title: "Solde à payer",
        body: `Le travail pour « ${booking.service_title} » est prêt — solde de ${owedDollars} $ à payer.`,
      },
    }).catch(() => {});
  }

  return { balance_due_cents: balanceDueCents };
}
