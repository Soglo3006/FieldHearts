/** Labels for booking.modified_fields — deduped for display */
const FIELD_LABEL_KEYS: Record<string, string> = {
  price: "bookings.modifiedFieldPrice",
  price_range: "bookings.modifiedFieldPriceRange",
  description: "bookings.modifiedFieldDescription",
  deposit: "bookings.modifiedFieldDeposit",
  estimated_hours: "bookings.modifiedFieldHours",
};

export function getModifiedFieldLabels(
  fields: string[] | null | undefined,
  t: (key: string) => string,
): string[] {
  if (!fields?.length) return [];
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const field of fields) {
    const key = field.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const labelKey = FIELD_LABEL_KEYS[key];
    labels.push(labelKey ? t(labelKey) : key);
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
  });
}
