import pool from "../config/db.js";
import { ensureDepositsAndCalendarSchema } from "../utils/depositSchema.js";
import { computeHourlyBalanceDueCents, isHourlyBooking } from "../utils/hourlyPayment.js";
import { createLocalizedNotification } from "./notificationService.js";

/**
 * Recompute balance_due_cents for hourly bookings after approved hours change.
 * Notifies the client when a balance becomes due.
 */
export async function refreshHourlyBalanceDue(bookingId, { notifyClient = false } = {}) {
  await ensureDepositsAndCalendarSchema(pool);

  const result = await pool.query(
    `SELECT b.*, s.title AS service_title, s.pricing_mode AS service_pricing_mode
     FROM bookings b
     JOIN services s ON s.id = b.service_id
     WHERE b.id = $1`,
    [bookingId],
  );
  if (result.rows.length === 0) return { balance_due_cents: 0 };

  const booking = result.rows[0];
  const pricingMode = booking.pricing_mode ?? booking.service_pricing_mode;
  if (!isHourlyBooking({ pricing_mode: pricingMode })) {
    return { balance_due_cents: 0 };
  }

  const balanceDueCents = computeHourlyBalanceDueCents(booking);
  const prevBalance = Number(booking.balance_due_cents) || 0;

  await pool.query(`UPDATE bookings SET balance_due_cents = $1 WHERE id = $2`, [
    balanceDueCents,
    bookingId,
  ]);

  if (
    notifyClient &&
    balanceDueCents > 0 &&
    balanceDueCents > prevBalance &&
    booking.payment_status === "deposit_paid"
  ) {
    const owedDollars = (balanceDueCents / 100).toFixed(2);
    createLocalizedNotification({
      userId: booking.client_id,
      type: "payment",
      link: "/bookings",
      en: {
        title: "Balance due",
        body: `Approved hours for "${booking.service_title}" require a balance payment of $${owedDollars}.`,
      },
      fr: {
        title: "Solde à payer",
        body: `Les heures approuvées pour « ${booking.service_title} » nécessitent un paiement de solde de ${owedDollars} $.`,
      },
    }).catch(() => {});
  }

  return { balance_due_cents: balanceDueCents };
}
