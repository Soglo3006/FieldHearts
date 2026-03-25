import pool from "../config/db.js";
import stripe from "../config/stripe.js";
import { notifyPaymentReceipt } from "../services/emailService.js";

// Fee rates (applied to service price)
const BUYER_COMMISSION_RATE  = 0.05;    // 5% buyer commission
const GST_RATE               = 0.05;    // 5% TPS (Federal)
const QST_RATE               = 0.09975; // 9.975% TVQ (Québec)
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// ─── Stripe Connect: create onboarding link for worker ───────────────────────
export const createConnectAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if worker already has a Stripe account
    const existing = await pool.query(
      "SELECT * FROM stripe_accounts WHERE user_id = $1",
      [userId]
    );

    let stripeAccountId;

    if (existing.rows.length > 0) {
      stripeAccountId = existing.rows[0].stripe_account_id;
    } else {
      // Get user email, account type and profile data
      const user = await pool.query(
        `SELECT email, account_type, full_name, company_name, phone, address, city, province
         FROM users WHERE id = $1`,
        [userId]
      );
      if (user.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const u = user.rows[0];
      const isCompany = u.account_type === "company";

      // Build address object if available
      const addressObj = u.city ? {
        line1: u.address || "",
        city: u.city || "",
        state: u.province || "",
        country: "CA",
      } : undefined;

      // Build individual prefill
      const individualData = !isCompany ? {
        email: u.email,
        ...(u.full_name && {
          first_name: u.full_name.split(" ")[0],
          last_name: u.full_name.split(" ").slice(1).join(" ") || u.full_name.split(" ")[0],
        }),
        ...(u.phone && { phone: u.phone }),
        ...(addressObj && { address: addressObj }),
      } : undefined;

      // Create Express Connect account
      const account = await stripe.accounts.create({
        type: "express",
        email: u.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: isCompany ? "company" : "individual",
        ...(individualData && { individual: individualData }),
        business_profile: {
          url: "https://www.uneden.ca",
          mcc: "7299",
          product_description: "Je fournis des services via la plateforme Uneden. Les clients me trouvent sur uneden.ca et les paiements sont traités par Uneden.",
        },
        settings: {
          payouts: { schedule: { interval: "manual" } },
        },
      });

      stripeAccountId = account.id;

      // Save to DB
      await pool.query(
        `INSERT INTO stripe_accounts (user_id, stripe_account_id, details_submitted, charges_enabled)
         VALUES ($1, $2, false, false)`,
        [userId, stripeAccountId]
      );
    }

    // Allow callers to specify a custom return URL (e.g. onboarding flow)
    const customReturnUrl = req.body?.return_url;
    const returnUrl = customReturnUrl
      ? `${FRONTEND_URL}${customReturnUrl}`
      : `${FRONTEND_URL}/wallet?stripe=success`;

    // Create account link (onboarding URL)
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${FRONTEND_URL}/wallet?stripe=refresh`,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    res.json({ url: accountLink.url });
  } catch (err) {
    console.error("Stripe Connect error:", err);
    res.status(500).json({ message: "Failed to create Stripe Connect account" });
  }
};

// ─── Get worker's Stripe Connect status ──────────────────────────────────────
export const getConnectStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      "SELECT * FROM stripe_accounts WHERE user_id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ connected: false, charges_enabled: false });
    }

    const row = result.rows[0];

    // Refresh status from Stripe
    const account = await stripe.accounts.retrieve(row.stripe_account_id);

    // Update DB with latest status
    await pool.query(
      `UPDATE stripe_accounts
       SET details_submitted = $1, charges_enabled = $2, updated_at = NOW()
       WHERE user_id = $3`,
      [account.details_submitted, account.charges_enabled, userId]
    );

    res.json({
      connected: true,
      charges_enabled: account.charges_enabled,
      details_submitted: account.details_submitted,
      stripe_account_id: row.stripe_account_id,
    });
  } catch (err) {
    console.error("Stripe status error:", err);
    res.status(500).json({ message: "Failed to get Stripe status" });
  }
};

// ─── Create Stripe Checkout Session (client pays for accepted booking) ────────
export const createCheckoutSession = async (req, res) => {
  try {
    const { booking_id } = req.body;
    const clientId = req.user.id;

    // Fetch booking + service + worker info
    const booking = await pool.query(
      `SELECT b.*, s.title, s.price, s.image_url,
              u.email AS worker_email
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN users u ON b.worker_id = u.id
       WHERE b.id = $1`,
      [booking_id]
    );

    if (booking.rows.length === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const b = booking.rows[0];

    if (b.client_id !== clientId) {
      return res.status(403).json({ message: "You are not the client for this booking" });
    }

    if (b.status !== "accepted") {
      return res.status(400).json({ message: "Booking must be accepted before payment" });
    }

    if (b.payment_status === "paid") {
      return res.status(400).json({ message: "This booking has already been paid" });
    }

    // Use custom_price if worker adjusted it, otherwise the original service price
    const effectivePrice          = Number(b.custom_price ?? b.price);
    const servicePriceCents       = Math.round(effectivePrice * 100);
    const buyerCommissionCents    = Math.round(servicePriceCents * BUYER_COMMISSION_RATE);
    const gstCents                = Math.round(servicePriceCents * GST_RATE);
    const qstCents                = Math.round(servicePriceCents * QST_RATE);
    const taxesCents              = gstCents + qstCents;
    const totalCents = servicePriceCents + buyerCommissionCents + taxesCents;

    // Create Checkout Session — funds go directly to platform account
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: b.title,
              description: "Service",
              ...(b.image_url && b.image_url.length <= 2048 && { images: [b.image_url] }),
            },
            unit_amount: servicePriceCents,
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: "cad",
            product_data: { name: "Commission acheteur (5%)" },
            unit_amount: buyerCommissionCents,
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: "cad",
            product_data: { name: "Taxes (TPS 5% + TVQ 9.975%)" },
            unit_amount: taxesCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      locale: req.body.locale || "fr-CA",
      success_url: `${FRONTEND_URL}/payment/success?booking_id=${booking_id}`,
      cancel_url: `${FRONTEND_URL}/payment/${booking_id}?cancelled=true`,
      metadata: {
        booking_id,
        service_price_cents: String(servicePriceCents),
      },
    });

    // Record pending payment in DB
    await pool.query(
      `INSERT INTO payments
         (booking_id, amount, status, stripe_checkout_session_id, platform_fee, currency)
       VALUES ($1, $2, 'pending', $3, $4, 'cad')
       ON CONFLICT DO NOTHING`,
      [booking_id, totalCents, session.id, buyerCommissionCents]
    );

    res.json({ url: session.url, session_id: session.id });
  } catch (err) {
    console.error("Checkout session error:", err);
    res.status(500).json({ message: "Failed to create checkout session" });
  }
};

// ─── Stripe Webhook ──────────────────────────────────────────────────────────
export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const bookingId = session.metadata?.booking_id;
    const paymentIntentId = session.payment_intent;

    if (bookingId) {
      try {
        // Update payment record
        await pool.query(
          `UPDATE payments
           SET status = 'paid', stripe_payment_intent_id = $1, updated_at = NOW()
           WHERE stripe_checkout_session_id = $2`,
          [paymentIntentId, session.id]
        );

        // Update booking payment_status and advance status to 'active'
        await pool.query(
          "UPDATE bookings SET payment_status = 'paid', status = 'active' WHERE id = $1 AND status = 'accepted'",
          [bookingId]
        );

        // Record transaction in wallet for the client (debit)
        const booking = await pool.query(
          `SELECT b.client_id, b.worker_id, p.amount, s.title, s.image_url,
                  CASE WHEN uw.account_type = 'company' THEN uw.company_name ELSE uw.full_name END AS worker_name,
                  CASE WHEN uc.account_type = 'company' THEN uc.company_name ELSE uc.full_name END AS client_name,
                  uc.email AS client_email
           FROM bookings b
           JOIN services s ON b.service_id = s.id
           JOIN users uw ON b.worker_id = uw.id
           JOIN users uc ON b.client_id = uc.id
           JOIN payments p ON p.booking_id = b.id AND p.status = 'paid'
           WHERE b.id = $1`,
          [bookingId]
        );
        if (booking.rows.length > 0) {
          const { client_id, amount, title, image_url, worker_name, client_name, client_email } = booking.rows[0];
          const amountDollars = (amount / 100).toFixed(2);
          const existing = await pool.query(
            "SELECT id FROM transactions WHERE booking_id = $1 AND type = 'debit'",
            [bookingId]
          );
          if (existing.rows.length === 0) {
            await pool.query(
              `INSERT INTO transactions (user_id, booking_id, type, amount, description, other_user_name, listing_title)
               VALUES ($1, $2, 'debit', $3, 'Payment for service', $4, $5)`,
              [client_id, bookingId, amountDollars, worker_name, title]
            );
            await pool.query(
              `INSERT INTO wallets (user_id, balance, total_spent)
               VALUES ($1, 0, $2)
               ON CONFLICT (user_id) DO UPDATE
               SET total_spent = wallets.total_spent + $2`,
              [client_id, amountDollars]
            );
            notifyPaymentReceipt(client_email, client_name, title, amountDollars, worker_name, bookingId, image_url);
          }
        }

        console.log(`Payment confirmed for booking ${bookingId} — now active`);
      } catch (err) {
        console.error("Error processing payment webhook:", err);
      }
    }
  }

  res.json({ received: true });
};

// ─── Release payment to worker (called when booking is marked completed) ──────
export const releasePayment = async (req, res) => {
  try {
    const { booking_id } = req.body;
    const userId = req.user.id;

    // Fetch booking
    const booking = await pool.query(
      `SELECT b.*, sa.stripe_account_id
       FROM bookings b
       LEFT JOIN stripe_accounts sa ON sa.user_id = b.worker_id
       WHERE b.id = $1`,
      [booking_id]
    );

    if (booking.rows.length === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const b = booking.rows[0];

    if (b.worker_id !== userId) {
      return res.status(403).json({ message: "Only the worker can release payment" });
    }

    if (b.status !== "completed") {
      return res.status(400).json({ message: "Booking must be completed before releasing payment" });
    }

    if (b.payment_status !== "paid") {
      return res.status(400).json({ message: "No payment found for this booking" });
    }

    // Fetch payment record
    const payment = await pool.query(
      "SELECT * FROM payments WHERE booking_id = $1 AND status = 'paid'",
      [booking_id]
    );

    if (payment.rows.length === 0) {
      return res.status(404).json({ message: "Payment record not found" });
    }

    const p = payment.rows[0];

    if (!b.stripe_account_id) {
      return res.status(400).json({ message: "Worker has no Stripe account" });
    }

    // Verify Stripe account is fully enabled before transferring
    const stripeAccount = await stripe.accounts.retrieve(b.stripe_account_id);
    if (!stripeAccount.charges_enabled) {
      return res.status(400).json({ message: "Worker's Stripe account is not fully set up yet" });
    }

    // Transfer 80% of service price to worker (20% kept as platform commission)
    const effectivePrice = Number(b.custom_price ?? b.price);
    const servicePriceCents = Math.round(effectivePrice * 100);
    const transferAmount = Math.round(servicePriceCents * 0.80);

    // source_transaction requires a charge ID (ch_xxx), not a payment intent ID (pi_xxx)
    let sourceTransaction = p.stripe_payment_intent_id;
    if (sourceTransaction && sourceTransaction.startsWith("pi_")) {
      try {
        const pi = await stripe.paymentIntents.retrieve(sourceTransaction);
        const chargeId = typeof pi.latest_charge === "object" ? pi.latest_charge?.id : pi.latest_charge;
        if (chargeId) sourceTransaction = chargeId;
      } catch (piErr) {
        console.error(`[releasePayment] Could not resolve charge for PI ${sourceTransaction}:`, piErr.message);
      }
    }

    const transfer = await stripe.transfers.create({
      amount: transferAmount,
      currency: p.currency || "cad",
      destination: b.stripe_account_id,
      source_transaction: sourceTransaction,
    });

    // Update payment record
    await pool.query(
      `UPDATE payments SET status = 'transferred', stripe_transfer_id = $1, updated_at = NOW()
       WHERE id = $2`,
      [transfer.id, p.id]
    );

    // Update booking payment_status
    await pool.query(
      "UPDATE bookings SET payment_status = 'transferred' WHERE id = $1",
      [booking_id]
    );

    res.json({ success: true, transfer_id: transfer.id });
  } catch (err) {
    console.error("Release payment error:", err);
    res.status(500).json({ message: "Failed to release payment" });
  }
};

// ─── Refund payment (for disputes resolved in client's favor) ─────────────────
export const refundPayment = async (req, res) => {
  try {
    const { booking_id } = req.body;

    const payment = await pool.query(
      "SELECT * FROM payments WHERE booking_id = $1 AND status = 'paid'",
      [booking_id]
    );

    if (payment.rows.length === 0) {
      return res.status(404).json({ message: "No paid payment found for this booking" });
    }

    const p = payment.rows[0];

    const refund = await stripe.refunds.create({
      payment_intent: p.stripe_payment_intent_id,
    });

    await pool.query(
      "UPDATE payments SET status = 'refunded', updated_at = NOW() WHERE id = $1",
      [p.id]
    );

    await pool.query(
      "UPDATE bookings SET payment_status = 'refunded' WHERE id = $1",
      [booking_id]
    );

    res.json({ success: true, refund_id: refund.id });
  } catch (err) {
    console.error("Refund error:", err);
    res.status(500).json({ message: "Failed to refund payment" });
  }
};

// ─── Get payment status for a booking ────────────────────────────────────────
export const getPaymentStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    const booking = await pool.query(
      "SELECT * FROM bookings WHERE id = $1",
      [bookingId]
    );

    if (booking.rows.length === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const b = booking.rows[0];

    if (b.client_id !== userId && b.worker_id !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const payment = await pool.query(
      "SELECT status, amount, platform_fee, currency, created_at FROM payments WHERE booking_id = $1 ORDER BY created_at DESC LIMIT 1",
      [bookingId]
    );

    res.json({
      payment_status: b.payment_status,
      payment: payment.rows[0] || null,
    });
  } catch (err) {
    console.error("Get payment status error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Verify and confirm payment after Stripe redirect ─────────────────────────
export const verifyPayment = async (req, res) => {
  try {
    const { booking_id } = req.body;

    // Get the pending payment for this booking
    const payment = await pool.query(
      "SELECT * FROM payments WHERE booking_id = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
      [booking_id]
    );

    if (payment.rows.length === 0) {
      // Already paid or no payment found — return current status
      const booking = await pool.query("SELECT payment_status, status FROM bookings WHERE id = $1", [booking_id]);
      return res.json({ already_confirmed: true, booking: booking.rows[0] });
    }

    const p = payment.rows[0];

    // Verify with Stripe that the session was actually paid
    const session = await stripe.checkout.sessions.retrieve(p.stripe_checkout_session_id);

    if (session.payment_status !== "paid") {
      return res.json({ confirmed: false, stripe_status: session.payment_status });
    }

    const paymentIntentId = session.payment_intent;

    // Update payment record
    await pool.query(
      `UPDATE payments SET status = 'paid', stripe_payment_intent_id = $1, updated_at = NOW()
       WHERE stripe_checkout_session_id = $2`,
      [paymentIntentId, session.id]
    );

    // Update booking to active
    await pool.query(
      "UPDATE bookings SET payment_status = 'paid', status = 'active' WHERE id = $1 AND status = 'accepted'",
      [booking_id]
    );

    // Record transaction in wallet
    const booking = await pool.query(
      `SELECT b.client_id, b.worker_id, p.amount, s.title, s.image_url,
              CASE WHEN uw.account_type = 'company' THEN uw.company_name ELSE uw.full_name END AS worker_name,
              CASE WHEN uc.account_type = 'company' THEN uc.company_name ELSE uc.full_name END AS client_name,
              uc.email AS client_email
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN users uw ON b.worker_id = uw.id
       JOIN users uc ON b.client_id = uc.id
       JOIN payments p ON p.booking_id = b.id AND p.status = 'paid'
       WHERE b.id = $1`,
      [booking_id]
    );

    if (booking.rows.length > 0) {
      const { client_id, amount, title, image_url, worker_name, client_name, client_email } = booking.rows[0];
      // amount is in cents — convert to dollars
      const amountDollars = (amount / 100).toFixed(2);

      const existing = await pool.query(
        "SELECT id FROM transactions WHERE booking_id = $1 AND type = 'debit'",
        [booking_id]
      );
      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO transactions (user_id, booking_id, type, amount, description, other_user_name, listing_title)
           VALUES ($1, $2, 'debit', $3, 'Payment for service', $4, $5)`,
          [client_id, booking_id, amountDollars, worker_name, title]
        );
        await pool.query(
          `INSERT INTO wallets (user_id, balance, total_spent)
           VALUES ($1, 0, $2)
           ON CONFLICT (user_id) DO UPDATE
           SET total_spent = wallets.total_spent + $2`,
          [client_id, amountDollars]
        );
        // Send receipt email only once
        notifyPaymentReceipt(client_email, client_name, title, amountDollars, worker_name, booking_id, image_url);
      }
    }

    res.json({ confirmed: true });
  } catch (err) {
    console.error("Verify payment error:", err);
    res.status(500).json({ message: "Failed to verify payment" });
  }
};
