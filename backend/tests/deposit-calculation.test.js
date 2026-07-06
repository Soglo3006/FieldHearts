import { describe, expect, it } from "vitest";
import { calculateDepositAmount } from "../src/utils/depositSchema.js";
import {
  computeBalanceDueCents,
  computeHourlyBalanceCheckoutAmounts,
  hasUnpaidBalanceDue,
  isFeesOnlyBalanceDue,
  resolveCheckoutKind,
  usesSplitDepositPayment,
} from "../src/utils/hourlyPayment.js";

describe("deposit calculation", () => {
  it("allows a fixed deposit equal to the full service price", () => {
    expect(
      calculateDepositAmount(20, {
        deposit_enabled: true,
        deposit_type: "fixed",
        deposit_value: 20,
      }),
    ).toBe(20);
  });

  it("allows a 100 percent deposit to equal the full service price", () => {
    expect(
      calculateDepositAmount(20, {
        deposit_enabled: true,
        deposit_type: "percent",
        deposit_value: 100,
      }),
    ).toBe(20);
  });
});

describe("checkout kind with full-price deposits", () => {
  it("treats a full-price deposit as a full checkout", () => {
    const booking = {
      status: "accepted",
      payment_status: "unpaid",
      pricing_mode: "fixed",
      price: 20,
      deposit_enabled: true,
      deposit_type: "fixed",
      deposit_value: 20,
    };

    expect(usesSplitDepositPayment(booking)).toBe(false);
    expect(resolveCheckoutKind(booking)).toBe("full");
  });

  it("keeps partial deposits as split payments", () => {
    const booking = {
      status: "accepted",
      payment_status: "unpaid",
      pricing_mode: "fixed",
      price: 20,
      deposit_enabled: true,
      deposit_type: "fixed",
      deposit_value: 10,
    };

    expect(usesSplitDepositPayment(booking)).toBe(true);
    expect(resolveCheckoutKind(booking)).toBe("deposit");
  });
});

describe("fees-only balance after full deposit", () => {
  const service = {
    pricing_mode: "fixed",
    price: 20,
    deposit_enabled: true,
    deposit_type: "fixed",
    deposit_value: 20,
  };

  const booking = {
    status: "completed",
    payment_status: "deposit_paid",
    pricing_mode: "fixed",
    price: 20,
    paid_service_base_cents: 2000,
    completed_by_worker: true,
    completed_by_client: true,
    ...service,
  };

  it("has zero service balance but fees still due", () => {
    expect(computeBalanceDueCents(booking, service)).toBe(0);
    expect(isFeesOnlyBalanceDue(booking, service)).toBe(true);
    expect(hasUnpaidBalanceDue(booking, service)).toBe(true);
    expect(resolveCheckoutKind(booking, service)).toBe("balance");
  });

  it("computes commission and taxes on full service base", () => {
    const amounts = computeHourlyBalanceCheckoutAmounts(20, 0, 0.13);
    expect(amounts.balanceBase).toBe(0);
    expect(amounts.commission).toBe(1);
    expect(amounts.taxes).toBe(2.6);
    expect(amounts.total).toBe(3.6);
  });
});
