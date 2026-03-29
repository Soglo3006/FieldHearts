export interface ProvinceTax {
  rate: number;
  labelEN: string;
  labelFR: string;
}

export const PROVINCE_TAXES: Record<string, ProvinceTax> = {
  AB: { rate: 0.05,     labelEN: "GST (5%)",                 labelFR: "TPS (5%)" },
  BC: { rate: 0.12,     labelEN: "GST (5%) + PST (7%)",      labelFR: "TPS (5%) + TVP (7%)" },
  MB: { rate: 0.12,     labelEN: "GST (5%) + PST (7%)",      labelFR: "TPS (5%) + TVP (7%)" },
  NB: { rate: 0.15,     labelEN: "HST (15%)",                labelFR: "TVH (15%)" },
  NL: { rate: 0.15,     labelEN: "HST (15%)",                labelFR: "TVH (15%)" },
  NS: { rate: 0.15,     labelEN: "HST (15%)",                labelFR: "TVH (15%)" },
  NT: { rate: 0.05,     labelEN: "GST (5%)",                 labelFR: "TPS (5%)" },
  NU: { rate: 0.05,     labelEN: "GST (5%)",                 labelFR: "TPS (5%)" },
  ON: { rate: 0.13,     labelEN: "HST (13%)",                labelFR: "TVH (13%)" },
  PE: { rate: 0.15,     labelEN: "HST (15%)",                labelFR: "TVH (15%)" },
  QC: { rate: 0.14975,  labelEN: "GST (5%) + QST (9.975%)", labelFR: "TPS (5%) + TVQ (9.975%)" },
  SK: { rate: 0.11,     labelEN: "GST (5%) + PST (6%)",      labelFR: "TPS (5%) + TVP (6%)" },
  YT: { rate: 0.05,     labelEN: "GST (5%)",                 labelFR: "TPS (5%)" },
};

export const PROVINCES = [
  { code: "AB", nameEN: "Alberta",                   nameFR: "Alberta" },
  { code: "BC", nameEN: "British Columbia",          nameFR: "Colombie-Britannique" },
  { code: "MB", nameEN: "Manitoba",                  nameFR: "Manitoba" },
  { code: "NB", nameEN: "New Brunswick",             nameFR: "Nouveau-Brunswick" },
  { code: "NL", nameEN: "Newfoundland and Labrador", nameFR: "Terre-Neuve-et-Labrador" },
  { code: "NS", nameEN: "Nova Scotia",               nameFR: "Nouvelle-Écosse" },
  { code: "NT", nameEN: "Northwest Territories",     nameFR: "Territoires du Nord-Ouest" },
  { code: "NU", nameEN: "Nunavut",                   nameFR: "Nunavut" },
  { code: "ON", nameEN: "Ontario",                   nameFR: "Ontario" },
  { code: "PE", nameEN: "Prince Edward Island",      nameFR: "Île-du-Prince-Édouard" },
  { code: "QC", nameEN: "Quebec",                    nameFR: "Québec" },
  { code: "SK", nameEN: "Saskatchewan",              nameFR: "Saskatchewan" },
  { code: "YT", nameEN: "Yukon",                     nameFR: "Yukon" },
];

// Maps full province names (stored in DB) to codes
const PROVINCE_NAME_TO_CODE: Record<string, string> = {
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

export function normalizeProvince(province: string): string {
  if (PROVINCE_TAXES[province.toUpperCase()]) return province.toUpperCase();
  return PROVINCE_NAME_TO_CODE[province.toLowerCase()] ?? "QC";
}

export function getTaxRate(province: string): number {
  const code = normalizeProvince(province);
  return PROVINCE_TAXES[code]?.rate ?? PROVINCE_TAXES.QC.rate;
}

export function getTaxLabel(province: string, lang: string): string {
  const code = normalizeProvince(province);
  const tax = PROVINCE_TAXES[code] ?? PROVINCE_TAXES.QC;
  return lang.startsWith("fr") ? tax.labelFR : tax.labelEN;
}
