/**
 * Étend les motifs ILIKE pour le filtre ville/région (Canada).
 * Les adresses comportent souvent la province en abréviation (ex. « ..., QC »).
 * Une recherche « Québec » / « Quebec » ne matche alors pas ces lignes avec un `%quebec%` seul.
 */

function asciiLowerNorm(s) {
  return String(s)
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** @param {string} userLocation */
export function expandLocationILIKEpatterns(userLocation) {
  const raw = typeof userLocation === "string" ? userLocation.trim() : "";
  if (!raw) return [];

  const n = asciiLowerNorm(raw);

  /** @type {Set<string>} */
  const patterns = new Set([`%${raw}%`]);

  const add = (...ps) => ps.forEach((p) => patterns.add(p));

  // Québec / QC / PQ (carte ancienne)
  const mentionsQuebec =
    n === "quebec" ||
    n === "qc" ||
    n === "pq" ||
    (n.includes("province") && n.includes("quebec"));

  const mentionsOntario =
    n === "ontario" ||
    n === "on" ||
    n.startsWith("ontario ") ||
    (n.includes("province") && n.includes("ontario"));

  if (mentionsQuebec) {
    add("%QC%", "%Québec%", "%Quebec%", "%, qc%", "% Québec%", "% Quebec%");
  }

  if (mentionsOntario) {
    add("%ON%", "%Ontario%", "%, ON%");
  }

  const mentionsBc =
    /\bcolombie\b/i.test(raw) ||
    /\bbritish columbia\b/i.test(raw) ||
    n === "bc" ||
    (n.includes("columbia") && n.includes("british"));

  if (mentionsBc) add("%BC%", "%British Columbia%", "%Colombie-Britannique%", "%, bc%");

  if (n === "ab" || n === "alberta") add("%AB%", "%Alberta%");
  if (n === "sk" || n.startsWith("saskatchewan") || /^sask\b/u.test(n)) add("%SK%", "%Saskatchewan%");
  if (n === "mb" || n === "manitoba") add("%MB%", "%Manitoba%");
  if (n === "ns" || n.includes("nova scot") || (n.includes("nouvelle") && n.includes("ecosse")))
    add("%NS%", "%Nova Scotia%", "%Nouvelle-Écosse%");

  const mentionsNb =
    n === "nb" || n.includes("new brunswick") || (n.includes("nouveau") && n.includes("brunswick"));
  if (mentionsNb) add("%NB%", "%New Brunswick%", "%Nouveau-Brunswick%");

  if (/prince[^\s]+\s+[eé]?douard|^pei\b|î[^\s]+\s+[eé]?dou/ui.test(raw.toLowerCase()))
    add("%PE%", "%Prince Edward%", "%Île-du-Prince");

  const mentionsNlw =
    n === "nl" ||
    n.includes("terre-neuve") ||
    /newfoundland/i.test(raw) ||
    /\blabrador\b/i.test(raw);
  if (mentionsNlw) add("%NL%", "%Newfoundland%", "%Terre-Neuve%");

  if (/\byukon\b/i.test(raw) || n === "yt") add("%YT%", "%Yukon%");

  const mentionsNt =
    n === "nt" ||
    /\bnorth.?west.?territoires?\b/i.test(raw.toLowerCase()) ||
    /\bterritoires du nord-ouest\b/i.test(raw);
  if (mentionsNt) add("%NT%", "%Northwest%", "%Nord-Ouest%");

  if (/\bnunavut\b/i.test(raw) || n === "nu") add("%NU%", "%Nunavut%");

  return [...patterns];
}
