import { describe, expect, it } from "vitest";
import { calculateDepositAmount } from "../src/utils/depositSchema.js";
import { resolveCheckoutKind, usesSplitDepositPayment } from "../src/utils/hourlyPayment.js";

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
