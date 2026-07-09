import pool from "../config/db.js";
import {
  calculateDepositAmount,
  ensureDepositsAndCalendarSchema,
  resolveBookingDepositMeta,
  resolveCheckoutBaseAmount,
} from "../utils/depositSchema.js";
import {
  computeBalanceDueCents,
  computeHourlyBalanceCheckoutAmounts,
  getHourlyInitialChargeBaseDollars,
  getFullServiceBaseCents,
  hasUnpaidBalanceDue,
  resolveCheckoutKind,
} from "../utils/hourlyPayment.js";
import { BUYER_COMMISSION_RATE } from "../utils/commissionRates.js";
import { getTaxRateForProvince, normalizeProvinceCode } from "../utils/taxProvince.js";

function getTaxLabel(province) {
  const code = normalizeProvinceCode(province) ?? "QC";
  const labels = {
    QC: "TPS/TVQ", ON: "HST", BC: "GST/PST", AB: "GST",
    MB: "GST/PST", SK: "GST/PST", NB: "HST", NL: "HST",
    NS: "HST", PE: "HST", NT: "GST", NU: "GST", YT: "GST",
  };
  return labels[code] ?? "Taxes";
}

/**
 * Shared checkout amount resolution for Checkout Session and PaymentIntent flows.
 */
export async function buildPaymentCheckoutContext({
  clientId,
  bookingId,
  billingAddressId = null,
  billingProvince = null,
  lang = "fr",
}) {
  await ensureDepositsAndCalendarSchema(pool);

  const booking = await pool.query(
    `SELECT b.*, s.title, s.price, s.price_max, s.image_url,
            COALESCE(b.pricing_mode, s.pricing_mode) AS pricing_mode,
            COALESCE(b.estimated_hours, s.estimated_hours) AS estimated_hours,
            s.estimated_hours AS service_estimated_hours,
            s.deposit_enabled AS service_deposit_enabled,
            s.deposit_type AS service_deposit_type,
            s.deposit_value AS service_deposit_value,
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
    [bookingId],
  );

  if (booking.rows.length === 0) {
    return { ok: false, status: 404, message: "Booking not found" };
  }

  const b = booking.rows[0];
  if (b.client_id !== clientId) {
    return { ok: false, status: 403, message: "You are not the client for this booking" };
  }

  const depositFields = resolveBookingDepositMeta(b);
  const serviceMeta = {
    pricing_mode: b.pricing_mode,
    price: b.price,
    price_max: b.price_max,
    estimated_hours: b.estimated_hours ?? b.service_estimated_hours,
    ...depositFields,
  };

  const checkoutKind = resolveCheckoutKind(b, serviceMeta);
  if (!checkoutKind) {
    return { ok: false, status: 400, message: "This booking has already been paid" };
  }

  if (checkoutKind === "full" || checkoutKind === "deposit") {
    if (b.status !== "accepted") {
      const message = b.status === "negotiating"
        ? (lang === "en"
          ? "Agree on a price with the other party before payment."
          : "Convenez d'un prix avec l'autre partie avant le paiement.")
        : "Booking must be accepted before payment";
      return { ok: false, status: 400, message };
    }
  } else if (checkoutKind === "balance") {
    if (b.status !== "active" && b.status !== "completed") {
      return { ok: false, status: 400, message: "Booking must be active before paying the balance" };
    }
    if (!["deposit_paid", "paid"].includes(b.payment_status)) {
      return { ok: false, status: 400, message: "Deposit must be paid before the balance" };
    }
  }

  let effectivePrice;
  let balanceCheckoutAmounts = null;
  if (checkoutKind === "deposit") {
    effectivePrice = getHourlyInitialChargeBaseDollars(b, serviceMeta);
  } else if (checkoutKind === "balance") {
    if (!hasUnpaidBalanceDue(b, serviceMeta)) {
      return { ok: false, status: 400, message: "No balance due for this booking" };
    }
    const balanceCents = computeBalanceDueCents(b, serviceMeta);
    const fullServiceDollars = getFullServiceBaseCents(b, serviceMeta) / 100;
    const taxRatePreview = getTaxRateForProvince(
      normalizeProvinceCode(billingProvince ?? b.client_province ?? "QC"),
    );
    balanceCheckoutAmounts = computeHourlyBalanceCheckoutAmounts(
      fullServiceDollars,
      balanceCents / 100,
      taxRatePreview,
    );
    effectivePrice = balanceCheckoutAmounts.balanceBase;
  } else {
    effectivePrice = resolveCheckoutBaseAmount(serviceMeta, b);
  }

  let billingAddress = null;
  if (billingAddressId) {
    const billingAddressResult = await pool.query(
      `SELECT id, full_name, address_line1, city, province, postal_code
       FROM billing_addresses
       WHERE id = $1 AND user_id = $2`,
      [billingAddressId, clientId],
    );
    if (billingAddressResult.rows.length === 0) {
      return { ok: false, status: 404, message: "Billing address not found" };
    }
    billingAddress = billingAddressResult.rows[0];
  }

  const effectiveProvince = normalizeProvinceCode(
    billingAddress?.province ?? billingProvince ?? b.client_province ?? "QC",
  ) ?? "QC";

  const isBalanceFeesOnlyCheckout =
    checkoutKind === "balance" &&
    balanceCheckoutAmounts != null &&
    balanceCheckoutAmounts.totalCents >= 1 &&
    balanceCheckoutAmounts.balanceBaseCents < 1;

  if (!isBalanceFeesOnlyCheckout) {
    if (effectivePrice == null || !Number.isFinite(effectivePrice) || effectivePrice < 0.01) {
      return {
        ok: false,
        status: 400,
        message: lang === "en"
          ? "A confirmed price ($0.01 CAD or more) is required before checkout. Negotiate with the seller or update the booking."
          : "Un montant confirmé (0,01 $ ou plus) est requis avant le paiement. Négociez avec le vendeur ou mettez à jour la réservation.",
      };
    }
  }

  const servicePriceCents = Math.round(effectivePrice * 100);
  const depositAmount = checkoutKind === "deposit"
    ? effectivePrice
    : calculateDepositAmount(resolveCheckoutBaseAmount(serviceMeta, b) ?? effectivePrice, b);
  const depositAmountCents = Math.round(depositAmount * 100);
  const isDepositOnly = checkoutKind === "deposit";
  const isBalanceCheckout = checkoutKind === "balance" && balanceCheckoutAmounts != null;
  const buyerCommissionCents = isDepositOnly
    ? 0
    : isBalanceCheckout
      ? balanceCheckoutAmounts.commissionCents
      : Math.round(servicePriceCents * BUYER_COMMISSION_RATE);
  const taxRate = getTaxRateForProvince(effectiveProvince);
  const taxesCents = isDepositOnly
    ? 0
    : isBalanceCheckout
      ? balanceCheckoutAmounts.taxesCents
      : Math.round(servicePriceCents * taxRate);
  const totalCents = isBalanceCheckout
    ? balanceCheckoutAmounts.totalCents
    : servicePriceCents + buyerCommissionCents + taxesCents;

  const defaultClientName = b.client_account_type === "company"
    ? (b.client_company_name || null)
    : (b.client_full_name || null);

  return {
    ok: true,
    data: {
      booking: b,
      serviceMeta,
      checkoutKind,
      billingAddress,
      effectiveProvince,
      servicePriceCents,
      depositAmountCents,
      buyerCommissionCents,
      taxesCents,
      totalCents,
      taxRate,
      taxLabel: getTaxLabel(effectiveProvince),
      isDepositOnly,
      defaultClientName,
      lineItemName:
        checkoutKind === "deposit"
          ? `${b.title} — Dépôt`
          : checkoutKind === "balance"
            ? `${b.title} — Solde`
            : b.title,
    },
  };
}
