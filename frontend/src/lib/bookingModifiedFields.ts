type ModifiedBookingSnapshot = {
  modified_fields?: string[] | null;
  pricing_mode?: string | null;
  price?: number | string | null;
  price_max?: number | string | null;
  custom_price?: number | string | null;
  custom_price_min?: number | string | null;
  custom_price_max?: number | string | null;
  deposit_enabled?: boolean | null;
  deposit_type?: string | null;
  deposit_value?: number | string | null;
  estimated_hours?: number | string | null;
};

function getLocale(language?: string | null) {
  return language?.toLowerCase().startsWith("fr") ? "fr-CA" : "en-CA";
}

function formatMoney(value: unknown, language?: string | null): string | null {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return `${new Intl.NumberFormat(getLocale(language), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)} $`;
}

function formatHours(value: unknown): string | null {
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours <= 0) return null;
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(2).replace(/\.?0+$/, "");
}

function normalizePricingMode(raw: unknown): "fixed" | "range" | "quote" | "hourly" {
  const value = String(raw ?? "fixed").toLowerCase().trim();
  if (value === "range" || value === "quote" || value === "hourly") return value;
  return "fixed";
}

export function getModifiedFieldLabels(
  booking: ModifiedBookingSnapshot,
  t: (key: string, opts?: Record<string, unknown>) => string,
  language?: string | null,
): string[] {
  const fields = booking.modified_fields;
  if (!fields?.length) return [];

  const seen = new Set<string>();
  const labels: string[] = [];
  const pricingMode = normalizePricingMode(booking.pricing_mode);

  for (const field of fields) {
    const key = field.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);

    if (key === "price_range") {
      const min = formatMoney(booking.custom_price_min ?? booking.price, language);
      const max = formatMoney(booking.custom_price_max ?? booking.price_max, language);
      labels.push(
        min && max
          ? t("bookings.modifiedFieldPriceRangeCurrent", { min, max })
          : t("bookings.modifiedFieldPriceRange"),
      );
      continue;
    }

    if (key === "price") {
      const amount = formatMoney(booking.custom_price ?? booking.price, language);
      if (pricingMode === "hourly") {
        labels.push(
          amount
            ? t("bookings.modifiedFieldHourlyRateCurrent", { amount })
            : t("bookings.modifiedFieldPrice"),
        );
      } else {
        labels.push(
          amount
            ? t("bookings.modifiedFieldPriceCurrent", { amount })
            : t("bookings.modifiedFieldPrice"),
        );
      }
      continue;
    }

    if (key === "deposit") {
      if (!booking.deposit_enabled || !booking.deposit_type || Number(booking.deposit_value) <= 0) {
        labels.push(t("bookings.modifiedFieldDepositRemoved"));
      } else if (booking.deposit_type === "percent") {
        labels.push(
          t("bookings.modifiedFieldDepositPercentCurrent", {
            percent: Number(booking.deposit_value),
          }),
        );
      } else {
        const amount = formatMoney(booking.deposit_value, language);
        labels.push(
          amount
            ? t("bookings.modifiedFieldDepositFixedCurrent", { amount })
            : t("bookings.modifiedFieldDeposit"),
        );
      }
      continue;
    }

    if (key === "estimated_hours") {
      const hours = formatHours(booking.estimated_hours);
      labels.push(
        hours
          ? t("bookings.modifiedFieldHoursCurrent", { hours })
          : t("bookings.modifiedFieldHours"),
      );
      continue;
    }

    if (key === "description") {
      labels.push(t("bookings.modifiedFieldDescriptionUpdated"));
      continue;
    }

    labels.push(key);
  }

  return labels;
}

export function bookingLiveFingerprint(booking: {
  status?: string | null;
  custom_price?: number | string | null;
  custom_price_min?: number | string | null;
  custom_price_max?: number | string | null;
  price_confirmed_by_client_at?: string | null;
  price_confirmed_by_worker_at?: string | null;
  completed_by_worker?: boolean;
  completed_by_client?: boolean;
  payment_status?: string | null;
  worker_note?: string | null;
  modified_fields?: string[] | null;
  deposit_type?: string | null;
  deposit_value?: number | string | null;
  last_modified_at?: string | null;
  approved_hours_total?: number | string | null;
}): string {
  return JSON.stringify({
    status: booking.status,
    custom_price: booking.custom_price,
    custom_price_min: booking.custom_price_min,
    custom_price_max: booking.custom_price_max,
    price_confirmed_by_client_at: booking.price_confirmed_by_client_at,
    price_confirmed_by_worker_at: booking.price_confirmed_by_worker_at,
    completed_by_worker: booking.completed_by_worker,
    completed_by_client: booking.completed_by_client,
    payment_status: booking.payment_status,
    worker_note: booking.worker_note,
    modified_fields: booking.modified_fields,
    deposit_type: booking.deposit_type,
    deposit_value: booking.deposit_value,
    last_modified_at: booking.last_modified_at,
    approved_hours_total: booking.approved_hours_total,
  });
}
