const PROVINCE_TAX_RATES = {
  AB: 0.05, BC: 0.12, MB: 0.12, NB: 0.15, NL: 0.15, NS: 0.15,
  NT: 0.05, NU: 0.05, ON: 0.13, PE: 0.15, QC: 0.14975, SK: 0.11, YT: 0.05,
};

const PROVINCE_NAME_TO_CODE = {
  alberta: "AB",
  "british columbia": "BC",
  "colombie-britannique": "BC",
  manitoba: "MB",
  "new brunswick": "NB",
  "nouveau-brunswick": "NB",
  "newfoundland and labrador": "NL",
  "nova scotia": "NS",
  "northwest territories": "NT",
  nunavut: "NU",
  ontario: "ON",
  "prince edward island": "PE",
  quebec: "QC",
  québec: "QC",
  saskatchewan: "SK",
  yukon: "YT",
};

export function normalizeProvinceCode(province) {
  if (!province) return null;
  const upper = String(province).trim().toUpperCase();
  if (PROVINCE_TAX_RATES[upper] !== undefined) return upper;
  return PROVINCE_NAME_TO_CODE[String(province).trim().toLowerCase()] ?? null;
}

export function getTaxRateForProvince(province) {
  if (!province) return PROVINCE_TAX_RATES.QC;
  const code = normalizeProvinceCode(province);
  return PROVINCE_TAX_RATES[code ?? "QC"] ?? PROVINCE_TAX_RATES.QC;
}

/** Province used for buyer taxes: default billing address, then profile province. */
export async function resolveClientTaxProvince(pool, clientId) {
  const billing = await pool.query(
    `SELECT province FROM billing_addresses
     WHERE user_id = $1
     ORDER BY is_default DESC, created_at ASC
     LIMIT 1`,
    [clientId],
  );
  if (billing.rows[0]?.province) {
    return normalizeProvinceCode(billing.rows[0].province);
  }
  const clientResult = await pool.query("SELECT province FROM users WHERE id = $1", [clientId]);
  return normalizeProvinceCode(clientResult.rows[0]?.province ?? null);
}

/** SQL fragment: billing province first, then users.province (alias `u` required). */
export const CLIENT_TAX_PROVINCE_SQL = `
  COALESCE(
    (SELECT ba.province FROM billing_addresses ba
     WHERE ba.user_id = u.id
     ORDER BY ba.is_default DESC, ba.created_at ASC
     LIMIT 1),
    u.province
  )`;
