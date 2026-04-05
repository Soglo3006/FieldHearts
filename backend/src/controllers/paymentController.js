import pool from "../config/db.js";
import stripe from "../config/stripe.js";
import { notifyPaymentReceipt } from "../services/emailService.js";
import { processBookingRefund } from "../services/refundService.js";

// ─── Ensure platform_earnings table exists ────────────────────────────────────
pool.query(`
  CREATE TABLE IF NOT EXISTS platform_earnings (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id    UUID REFERENCES bookings(id),
    type          TEXT NOT NULL CHECK (type IN ('buyer_commission', 'worker_commission')),
    amount        NUMERIC(10, 2) NOT NULL,
    description   TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (booking_id, type)
  )
`).catch((err) => console.error("[DB] Failed to create platform_earnings table:", err.message));

// Fee rates
const BUYER_COMMISSION_RATE = 0.05; // 5% buyer commission
const WORKER_COMMISSION_RATE = 0.20; // 20% kept when worker is paid out
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Tax rates by Canadian province
const PROVINCE_TAX_RATES = {
  AB: 0.05,
  BC: 0.12,
  MB: 0.12,
  NB: 0.15,
  NL: 0.15,
  NS: 0.15,
  NT: 0.05,
  NU: 0.05,
  ON: 0.13,
  PE: 0.15,
  QC: 0.14975,
  SK: 0.11,
  YT: 0.05,
};

const PROVINCE_TAX_LABELS = {
  AB: "GST (5%)",
  BC: "GST (5%) + PST (7%)",
  MB: "GST (5%) + PST (7%)",
  NB: "HST (15%)",
  NL: "HST (15%)",
  NS: "HST (15%)",
  NT: "GST (5%)",
  NU: "GST (5%)",
  ON: "HST (13%)",
  PE: "HST (15%)",
  QC: "GST (5%) + QST (9.975%)",
  SK: "GST (5%) + PST (6%)",
  YT: "GST (5%)",
};

const PROVINCE_NAME_TO_CODE = {
  "alberta": "AB",
  "british columbia": "BC", "colombie-britannique": "BC",
  "manitoba": "MB",
  "new brunswick": "NB", "nouveau-brunswick": "NB",
  "newfoundland and labrador": "NL", "terre-neuve-et-labrador": "NL",
  "nova scotia": "NS", "nouvelle-écosse": "NS",
  "northwest territories": "NT", "territoires du nord-ouest": "NT",
  "nunavut": "NU",
  "ontario": "ON",
  "prince edward island": "PE", "île-du-prince-édouard": "PE",
  "quebec": "QC", "québec": "QC",
  "saskatchewan": "SK",
  "yukon": "YT",
};

function normalizeProvince(province) {
  if (!province) return "QC";
  if (PROVINCE_TAX_RATES[province.toUpperCase()]) return province.toUpperCase();
  return PROVINCE_NAME_TO_CODE[province.toLowerCase()] ?? "QC";
}

function getTaxRate(province) {
  return PROVINCE_TAX_RATES[normalizeProvince(province)] ?? PROVINCE_TAX_RATES.QC;
}

function getTaxLabel(province) {
  return PROVINCE_TAX_LABELS[normalizeProvince(province)] ?? PROVINCE_TAX_LABELS.QC;
}

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

    // Allow callers to specify a custom return path (e.g. onboarding flow)
    // Validate it's a relative path starting with / and contains no protocol to prevent open redirect
    const customReturnUrl = req.body?.return_url;
    const isValidReturnPath = customReturnUrl
      && typeof customReturnUrl === "string"
      && customReturnUrl.startsWith("/")
      && !customReturnUrl.includes("://")
      && !customReturnUrl.startsWith("//");
    const returnUrl = isValidReturnPath
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

    // Refresh status from Stripe — the account may have been deleted or
    // deauthorized, so handle Stripe errors gracefully instead of crashing.
    let account;
    try {
      account = await stripe.accounts.retrieve(row.stripe_account_id);
    } catch (stripeErr) {
      console.error("[Stripe] accounts.retrieve failed:", stripeErr?.message);

      // If the account no longer exists on Stripe, treat as disconnected
      if (stripeErr?.code === "account_invalid" || stripeErr?.statusCode === 404) {
        await pool.query("DELETE FROM stripe_accounts WHERE user_id = $1", [userId]);
        return res.json({ connected: false, charges_enabled: false });
      }

      // For other Stripe errors (network, key missing, etc.) return cached DB values
      return res.json({
        connected: true,
        charges_enabled: row.charges_enabled ?? false,
        details_submitted: row.details_submitted ?? false,
        stripe_account_id: row.stripe_account_id,
        cached: true,
      });
    }

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
    console.error("[Stripe] getConnectStatus error:", err);
    res.status(500).json({ message: "Failed to get Stripe status" });
  }
};

// ─── Create Stripe Checkout Session (client pays for accepted booking) ────────
export const createCheckoutSession = async (req, res) => {
  try {
    const { booking_id, billing_province, billing_address_id } = req.body;
    const clientId = req.user.id;

    // Fetch booking + service + worker + client info
    const booking = await pool.query(
      `SELECT b.*, s.title, s.price, s.image_url,
              u.email AS worker_email, u.province AS worker_province,
              uc.email AS client_email,
              uc.full_name AS client_full_name,
              uc.company_name AS client_company_name,
              uc.account_type AS client_account_type,
              uc.province AS client_province
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN users u ON b.worker_id = u.id
       JOIN users uc ON b.client_id = uc.id
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

    let billingAddress = null;
    if (billing_address_id) {
      const billingAddressResult = await pool.query(
        `SELECT id, full_name, address_line1, city, province, postal_code
         FROM billing_addresses
         WHERE id = $1 AND user_id = $2`,
        [billing_address_id, clientId]
      );

      if (billingAddressResult.rows.length === 0) {
        return res.status(404).json({ message: "Billing address not found" });
      }

      billingAddress = billingAddressResult.rows[0];
    }

    // Use billing_province from request if provided (user selected at payment time),
    // otherwise fall back to stored tax_rate or client's profile province
    // normalizeProvince ensures we always store a 2-letter code (e.g. "QC" not "Quebec")
    const effectiveProvince    = normalizeProvince(billingAddress?.province ?? billing_province ?? b.client_province ?? "QC");
    const effectivePrice       = Number(b.custom_price ?? b.price);
    const servicePriceCents    = Math.round(effectivePrice * 100);
    const buyerCommissionCents = Math.round(servicePriceCents * BUYER_COMMISSION_RATE);
    const taxRate              = getTaxRate(effectiveProvince);
    const taxesCents           = Math.round(servicePriceCents * taxRate);
    const totalCents           = servicePriceCents + buyerCommissionCents + taxesCents;
    const province             = effectiveProvince;

    let stripeCustomerId;
    if (billingAddress) {
      const defaultClientName = b.client_account_type === "company"
        ? (b.client_company_name || null)
        : (b.client_full_name || null);

      const customer = await stripe.customers.create({
        email: b.client_email,
        ...(billingAddress.full_name || defaultClientName
          ? { name: billingAddress.full_name || defaultClientName }
          : {}),
        address: {
          line1: billingAddress.address_line1,
          city: billingAddress.city,
          state: normalizeProvince(billingAddress.province),
          country: "CA",
          ...(billingAddress.postal_code ? { postal_code: billingAddress.postal_code } : {}),
        },
        metadata: {
          booking_id,
          user_id: clientId,
          billing_address_id,
        },
      });

      stripeCustomerId = customer.id;
    }

    // Update the booking's tax_rate to reflect the billing address province used
    await pool.query(
      "UPDATE bookings SET tax_rate = $1, client_province = $2 WHERE id = $3",
      [taxRate, effectiveProvince, booking_id]
    );

    // Create Checkout Session — funds go directly to platform account
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
      billing_address_collection: "required",
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
            product_data: { name: `Taxes (${getTaxLabel(province)})` },
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
        ...(billing_address_id ? { billing_address_id: String(billing_address_id) } : {}),
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

          // ── Record platform's 5% buyer commission (idempotent) ────────────
          const servicePriceCents = Number(session.metadata?.service_price_cents ?? 0);
          if (servicePriceCents > 0) {
            const buyerCommission = (Math.round(servicePriceCents * BUYER_COMMISSION_RATE) / 100).toFixed(2);
            await pool.query(
              `INSERT INTO platform_earnings (booking_id, type, amount, description)
               VALUES ($1, 'buyer_commission', $2, 'Commission acheteur 5% — ' || $3)
               ON CONFLICT (booking_id, type) DO NOTHING`,
              [bookingId, buyerCommission, title]
            );
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
    const { booking_id, refund_amount_cents } = req.body;
    const refundResult = await processBookingRefund({
      bookingId: booking_id,
      refundAmountCents: refund_amount_cents,
      cancelBooking: true,
    });

    res.json({
      success: true,
      ...refundResult,
    });
  } catch (err) {
    console.error("Refund error:", err);
    if (err.statusCode) {
      return res.status(err.statusCode).json(err.payload);
    }
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
    const userId = req.user.id;

    // Verify the caller is the client for this booking
    const ownershipCheck = await pool.query(
      "SELECT client_id FROM bookings WHERE id = $1",
      [booking_id]
    );
    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }
    if (ownershipCheck.rows[0].client_id !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

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
