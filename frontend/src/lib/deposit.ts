import { normalizePricingMode, type ListingPricingFields } from "./listingPrice";

export type DepositType = "fixed" | "percent";

export type DepositConfig = {
  deposit_enabled?: boolean;
  deposit_type?: DepositType | string | null;
  deposit_value?: number | string | null;
};

type DepositBaseInput = ListingPricingFields & {
  estimated_hours?: number | string | null;
};

type BookingDepositInput = {
  custom_price?: number | string | null;
  custom_price_min?: number | string | null;
  custom_price_max?: number | string | null;
  estimated_hours?: number | string | null;
};

export function resolveDepositBaseAmount(
  service: DepositBaseInput,
  booking: BookingDepositInput | null = null,
): number | null {
  const mode = normalizePricingMode(service.pricing_mode);
  const custom =
    booking?.custom_price != null ? Number(booking.custom_price) : null;

  if (mode === "quote") {
    if (custom != null && Number.isFinite(custom) && custom >= 0.01) return custom;
    const sp = service.price != null ? Number(service.price) : null;
    if (sp != null && Number.isFinite(sp) && sp >= 0.01) return sp;
    return null;
  }

  if (mode === "range") {
    if (custom != null && Number.isFinite(custom) && custom >= 0.01) return custom;
    const customMax = booking?.custom_price_max != null ? Number(booking.custom_price_max) : null;
    if (customMax != null && Number.isFinite(customMax) && customMax >= 0.01) return customMax;
    const hi = Number(service.price_max ?? service.price);
    if (Number.isFinite(hi) && hi >= 0.01) return hi;
    return null;
  }

  if (mode === "hourly") {
    const rate = Number(service.price);
    if (!Number.isFinite(rate) || rate < 0.01) return null;
    const hours = Number(
      booking?.estimated_hours ?? service.estimated_hours ?? 1,
    );
    const h = Number.isFinite(hours) && hours > 0 ? hours : 1;
    return Math.round(rate * h * 100) / 100;
  }

  const p =
    custom != null && Number.isFinite(custom) ? custom : Number(service.price);
  return Number.isFinite(p) && p >= 0.01 ? p : null;
}

export function calculateDepositAmount(
  servicePrice: number,
  config: DepositConfig | null | undefined,
): number {
  if (!config?.deposit_enabled) return 0;
  const price = Number(servicePrice);
  if (!Number.isFinite(price) || price < 0.02) return 0;

  const type = config.deposit_type;
  const raw = Number(config.deposit_value);
  if ((type !== "fixed" && type !== "percent") || !Number.isFinite(raw) || raw <= 0) return 0;

  let deposit = type === "percent" ? price * (raw / 100) : raw;
  deposit = Math.min(deposit, price - 0.01);
  return Math.round(Math.max(0, deposit) * 100) / 100;
}

export function formatDepositLabel(
  t: (key: string, opts?: Record<string, unknown>) => string,
  config: DepositConfig & { pricing_mode?: string | null },
  servicePrice: number,
): string {
  const amount = calculateDepositAmount(servicePrice, config);
  if (amount <= 0) return "";

  if (config.deposit_type === "percent") {
    const mode = normalizePricingMode(config.pricing_mode);
    // For range/hourly, exact amount is variable — show percentage only
    if (mode === "range" || mode === "hourly") {
      return t("deposit.percentOnlyLabel", { percent: config.deposit_value });
    }
    return t("deposit.percentLabel", {
      percent: config.deposit_value,
      amount: amount.toFixed(2),
    });
  }
  return t("deposit.fixedLabel", { amount: amount.toFixed(2) });
}
