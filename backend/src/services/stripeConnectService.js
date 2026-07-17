import pool from "../config/db.js";
import stripe from "../config/stripe.js";
import { normalizeProvinceCode } from "../utils/taxProvince.js";

pool.query(`
  ALTER TABLE stripe_accounts
  ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'express'
`).catch((err) => console.error("[DB] stripe_accounts.account_type:", err.message));

const DEFAULT_CONNECT_ACCOUNT_TYPE = process.env.STRIPE_CONNECT_ACCOUNT_TYPE === "express"
  ? "express"
  : "custom";

/** Custom accounts: skip connect.stripe.com email/phone signup — stay embedded in Uneden. */
export const CONNECT_EMBEDDED_SESSION_FEATURES = {
  external_account_collection: true,
  disable_stripe_user_authentication: true,
};

function splitFullName(fullName) {
  if (!fullName?.trim()) return { first_name: undefined, last_name: undefined };
  const parts = fullName.trim().split(/\s+/);
  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(" ") || parts[0],
  };
}

export async function loadUserConnectProfile(userId) {
  const user = await pool.query(
    `SELECT id, email, account_type, full_name, company_name, phone, address, city, province, postal_code
     FROM users WHERE id = $1`,
    [userId],
  );
  return user.rows[0] ?? null;
}

function hasText(value) {
  return Boolean(value && String(value).trim());
}

function formatCanadianPostal(postalCode) {
  if (!postalCode) return undefined;
  const compact = String(postalCode).replace(/\s+/g, "").toUpperCase();
  if (compact.length !== 6) return String(postalCode).trim();
  return `${compact.slice(0, 3)} ${compact.slice(3)}`;
}

function normalizePhoneE164(phone) {
  if (!hasText(phone)) return undefined;
  const trimmed = String(phone).trim();
  if (trimmed.startsWith("+")) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return trimmed;
}

export function getMissingPayoutProfileFields(user) {
  if (!user) return ["profile"];
  const missing = [];
  const isCompany = user.account_type === "company";

  if (isCompany) {
    if (!hasText(user.company_name)) missing.push("company_name");
    if (!hasText(user.full_name)) missing.push("representative_name");
  } else if (!hasText(user.full_name)) {
    missing.push("full_name");
  }
  if (!hasText(user.phone)) missing.push("phone");
  if (!hasText(user.address)) missing.push("address");
  if (!hasText(user.city)) missing.push("city");
  if (!hasText(user.province)) missing.push("province");
  if (!hasText(user.postal_code)) missing.push("postal_code");
  return missing;
}

export function isUserPayoutProfileComplete(user) {
  return getMissingPayoutProfileFields(user).length === 0;
}

function buildAddressObject(user) {
  if (!hasText(user?.address) && !hasText(user?.city)) return undefined;
  const state = normalizeProvinceCode(user.province) || undefined;
  const postal_code = formatCanadianPostal(user.postal_code);
  return {
    line1: String(user.address || "").trim() || undefined,
    city: String(user.city || "").trim() || undefined,
    ...(state && { state }),
    ...(postal_code && { postal_code }),
    country: "CA",
  };
}

function buildIndividualRelationship(user) {
  const isCompany = user?.account_type === "company";
  return {
    title: isCompany ? "Propriétaire" : "Travailleur autonome",
  };
}

function buildIndividualData(user, { includeAddress = true } = {}) {
  if (!user) return undefined;
  const { first_name, last_name } = splitFullName(user.full_name);
  const phone = normalizePhoneE164(user.phone);
  const address = includeAddress ? buildAddressObject(user) : undefined;
  return {
    email: user.email,
    ...(first_name && { first_name }),
    ...(last_name && { last_name }),
    ...(phone && { phone }),
    ...(address && { address }),
    relationship: buildIndividualRelationship(user),
  };
}

export function buildConnectUpdatePayload(user) {
  if (!user) return {};
  const isCompany = user.account_type === "company";
  const payload = {
    email: user.email,
    business_type: isCompany ? "company" : "individual",
  };

  const individual = buildIndividualData(user, { includeAddress: !isCompany });
  if (individual && Object.keys(individual).length > 1) {
    payload.individual = individual;
  }

  if (isCompany && hasText(user.company_name)) {
    const address = buildAddressObject(user);
    payload.company = {
      name: String(user.company_name).trim(),
      ...(address && { address }),
    };
  }

  return payload;
}

export async function syncProfileToStripeAccount(userId, stripeAccountId, accountType = "custom") {
  const user = await loadUserConnectProfile(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  const missing = getMissingPayoutProfileFields(user);
  if (missing.length > 0) {
    const err = new Error("Profile incomplete for payout setup");
    err.statusCode = 400;
    err.code = "PROFILE_INCOMPLETE";
    err.missing_fields = missing;
    throw err;
  }

  // Express/Standard accounts are self-managed by the connected user through Stripe's own
  // hosted onboarding — the platform isn't permitted to edit business_type/individual/email on
  // them directly (Stripe rejects with a permission error). Only "custom" accounts
  // (requirement_collection: "application") accept platform-driven updates.
  if (accountType !== "custom") {
    return { synced: false, stripe_account_id: stripeAccountId };
  }

  const updatePayload = buildConnectUpdatePayload(user);
  if (Object.keys(updatePayload).length > 0) {
    await stripe.accounts.update(stripeAccountId, updatePayload);
  }

  return { synced: true, stripe_account_id: stripeAccountId };
}

export function buildConnectAccountPayload(user, accountType = DEFAULT_CONNECT_ACCOUNT_TYPE) {
  const isCompany = user.account_type === "company";
  const address = buildAddressObject(user);

  const base = {
    country: "CA",
    email: user.email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: isCompany ? "company" : "individual",
    business_profile: {
      url: "https://www.uneden.ca",
      mcc: "7299",
      product_description:
        "Je fournis des services via la plateforme Uneden. Les clients me trouvent sur uneden.ca et les paiements sont traités par Uneden.",
    },
    settings: {
      payouts: { schedule: { interval: "manual" } },
    },
    metadata: {
      uneden_user_id: String(user.id ?? ""),
    },
  };

  if (accountType === "custom") {
    // Custom/platform-controlled accounts use `controller` — not `type` (mutually exclusive in Stripe API).
    // With dashboard hidden + platform liability, platform must collect KYC via embedded components.
    base.controller = {
      stripe_dashboard: { type: "none" },
      fees: { payer: "application" },
      losses: { payments: "application" },
      requirement_collection: "application",
    };
  } else {
    base.type = accountType;
  }

  if (!isCompany) {
    const individual = buildIndividualData(user);
    if (individual) base.individual = individual;
  } else {
    const representative = buildIndividualData(user, { includeAddress: false });
    if (representative) base.individual = representative;
  }
  if (isCompany && user.company_name) {
    base.company = {
      name: user.company_name,
      ...(address && { address }),
    };
  }

  return base;
}

export async function getStoredStripeAccount(userId) {
  const result = await pool.query(
    "SELECT * FROM stripe_accounts WHERE user_id = $1",
    [userId],
  );
  return result.rows[0] ?? null;
}

/** Remove Connect account when user switches account type (person ↔ company). */
export async function resetStripeConnectAccount(userId) {
  const existing = await getStoredStripeAccount(userId);
  if (!existing?.stripe_account_id) {
    return { reset: false };
  }

  try {
    await stripe.accounts.del(existing.stripe_account_id);
  } catch (err) {
    console.warn("[Stripe] Could not delete Connect account on type change:", err?.message);
  }

  await pool.query("DELETE FROM stripe_accounts WHERE user_id = $1", [userId]);
  return { reset: true, stripe_account_id: existing.stripe_account_id };
}

export async function ensureStripeConnectAccount(userId) {
  const existing = await getStoredStripeAccount(userId);
  if (existing?.stripe_account_id) {
    // `controller` is create-only — never update it on an existing account
    // (Stripe rejects the param and concurrent updates cause lock_timeout).
    return {
      stripeAccountId: existing.stripe_account_id,
      accountType: existing.account_type || "express",
      created: false,
    };
  }

  const user = await loadUserConnectProfile(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  const accountType = DEFAULT_CONNECT_ACCOUNT_TYPE;
  const account = await stripe.accounts.create(buildConnectAccountPayload(user, accountType));

  await pool.query(
    `INSERT INTO stripe_accounts (user_id, stripe_account_id, details_submitted, charges_enabled, account_type)
     VALUES ($1, $2, false, false, $3)
     ON CONFLICT (user_id) DO UPDATE SET
       stripe_account_id = EXCLUDED.stripe_account_id,
       account_type = EXCLUDED.account_type,
       details_submitted = false,
       charges_enabled = false,
       updated_at = NOW()`,
    [userId, account.id, accountType],
  );

  return { stripeAccountId: account.id, accountType, created: true };
}

function isStripeRetryableError(err) {
  return (
    err?.code === "lock_timeout" ||
    err?.type === "StripeRateLimitError" ||
    err?.statusCode === 429 ||
    err?.raw?.code === "lock_timeout" ||
    err?.headers?.["stripe-should-retry"] === "true"
  );
}

async function withStripeRetry(fn, { retries = 4, baseDelayMs = 500 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isStripeRetryableError(err) || attempt === retries) throw err;
      const delay = baseDelayMs * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastErr;
}

/** Serialize session creates per user — each caller gets a unique secret (no shared claim). */
const connectSessionQueues = new Map();

async function createConnectAccountSessionUnlocked(userId, { components, requireProfile = true } = {}) {
  if (requireProfile) {
    const user = await loadUserConnectProfile(userId);
    const missing = getMissingPayoutProfileFields(user);
    if (missing.length > 0) {
      const err = new Error("Profile incomplete for payout setup");
      err.statusCode = 400;
      err.code = "PROFILE_INCOMPLETE";
      err.missing_fields = missing;
      throw err;
    }
  }

  const { stripeAccountId, accountType: existingAccountType } = await ensureStripeConnectAccount(userId);

  // Sync profile only for onboarding. Management sessions skip accounts.update
  // so we don't contend with accountSessions.create (lock_timeout).
  if (requireProfile) {
    const user = await loadUserConnectProfile(userId);
    if (isUserPayoutProfileComplete(user)) {
      await withStripeRetry(() => syncProfileToStripeAccount(userId, stripeAccountId, existingAccountType));
    } else if (user && existingAccountType === "custom") {
      const businessPayload = buildConnectUpdatePayload(user);
      if (Object.keys(businessPayload).length > 0) {
        await withStripeRetry(() => stripe.accounts.update(stripeAccountId, businessPayload));
      }
    }
  }

  const session = await withStripeRetry(() =>
    stripe.accountSessions.create({
      account: stripeAccountId,
      components: components ?? {
        account_onboarding: {
          enabled: true,
          features: CONNECT_EMBEDDED_SESSION_FEATURES,
        },
      },
    }),
  );

  return { client_secret: session.client_secret, stripe_account_id: stripeAccountId };
}

export async function createConnectAccountSession(userId, options = {}) {
  const prev = connectSessionQueues.get(userId) ?? Promise.resolve();
  const current = prev.then(
    () => createConnectAccountSessionUnlocked(userId, options),
    () => createConnectAccountSessionUnlocked(userId, options),
  );
  connectSessionQueues.set(
    userId,
    current.finally(() => {
      if (connectSessionQueues.get(userId) === current) {
        connectSessionQueues.delete(userId);
      }
    }),
  );
  return current;
}

export async function syncConnectAccountStatus(userId, stripeAccountId) {
  const account = await stripe.accounts.retrieve(stripeAccountId, {
    expand: ["external_accounts"],
  });

  await pool.query(
    `UPDATE stripe_accounts
     SET details_submitted = $1,
         charges_enabled = $2,
         updated_at = NOW()
     WHERE user_id = $3`,
    [account.details_submitted, account.charges_enabled, userId],
  );

  const externalAccounts = account.external_accounts?.data ?? [];
  const bank = externalAccounts.find((ea) => ea.object === "bank_account");

  return {
    connected: true,
    charges_enabled: account.charges_enabled,
    details_submitted: account.details_submitted,
    requirements_due: account.requirements?.currently_due ?? [],
    stripe_account_id: stripeAccountId,
    account_type: account.type,
    bank_account: bank
      ? {
          bank_name: bank.bank_name || null,
          last4: bank.last4 || null,
          currency: bank.currency ? String(bank.currency).toUpperCase() : null,
          routing_number: bank.routing_number || null,
          country: bank.country || null,
        }
      : null,
  };
}
