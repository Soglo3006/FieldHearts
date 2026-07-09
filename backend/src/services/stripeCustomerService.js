import pool from "../config/db.js";
import stripe from "../config/stripe.js";
import { normalizeProvinceCode } from "../utils/taxProvince.js";

let schemaReady = false;

async function ensureStripeCustomersSchema() {
  if (schemaReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stripe_customers (
      user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      stripe_customer_id  TEXT NOT NULL UNIQUE,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  schemaReady = true;
}

export async function getStoredStripeCustomerId(userId) {
  await ensureStripeCustomersSchema();
  const row = await pool.query(
    "SELECT stripe_customer_id FROM stripe_customers WHERE user_id = $1",
    [userId],
  );
  return row.rows[0]?.stripe_customer_id ?? null;
}

export async function getOrCreateStripeCustomer(userId, profile = {}) {
  await ensureStripeCustomersSchema();
  const existing = await getStoredStripeCustomerId(userId);
  if (existing) {
    if (profile.address || profile.name || profile.email) {
      await stripe.customers.update(existing, {
        ...(profile.email ? { email: profile.email } : {}),
        ...(profile.name ? { name: profile.name } : {}),
        ...(profile.address ? { address: profile.address } : {}),
      }).catch(() => {});
    }
    return existing;
  }

  const userRow = await pool.query(
    `SELECT email,
            CASE WHEN account_type = 'company' THEN company_name ELSE full_name END AS display_name
     FROM users WHERE id = $1`,
    [userId],
  );
  const user = userRow.rows[0];
  const email = profile.email || user?.email;
  const name = profile.name || user?.display_name || undefined;

  const customer = await stripe.customers.create({
    email,
    ...(name ? { name } : {}),
    ...(profile.address ? { address: profile.address } : {}),
    metadata: { uneden_user_id: String(userId) },
  });

  await pool.query(
    `INSERT INTO stripe_customers (user_id, stripe_customer_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE
     SET stripe_customer_id = EXCLUDED.stripe_customer_id, updated_at = NOW()`,
    [userId, customer.id],
  );

  return customer.id;
}

export function billingAddressToStripeAddress(billingAddress) {
  if (!billingAddress) return undefined;
  return {
    line1: billingAddress.address_line1,
    city: billingAddress.city,
    state: normalizeProvinceCode(billingAddress.province) ?? billingAddress.province,
    country: "CA",
    ...(billingAddress.postal_code ? { postal_code: billingAddress.postal_code } : {}),
  };
}

export async function listCustomerPaymentMethods(userId) {
  const customerId = await getStoredStripeCustomerId(userId);
  if (!customerId) return [];

  const methods = await stripe.paymentMethods.list({
    customer: customerId,
    type: "card",
  });

  return methods.data.map((pm) => ({
    id: pm.id,
    brand: pm.card?.brand,
    last4: pm.card?.last4,
    exp_month: pm.card?.exp_month,
    exp_year: pm.card?.exp_year,
    is_default: false,
  }));
}

export async function createCustomerSetupIntent(userId) {
  const customerId = await getOrCreateStripeCustomer(userId);
  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
    usage: "off_session",
    metadata: { uneden_user_id: String(userId) },
  });
  return { client_secret: setupIntent.client_secret, customer_id: customerId };
}

export async function detachCustomerPaymentMethod(userId, paymentMethodId) {
  const customerId = await getStoredStripeCustomerId(userId);
  if (!customerId) {
    const err = new Error("No Stripe customer");
    err.statusCode = 404;
    throw err;
  }

  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  if (pm.customer !== customerId) {
    const err = new Error("Payment method not found");
    err.statusCode = 404;
    throw err;
  }

  await stripe.paymentMethods.detach(paymentMethodId);
  return { success: true };
}
