/**
 * Google Places suggestions are normally proper Unicode. In rare cases UTF-8
 * bytes are exposed as Windows-1252/Latin-1 ("Sept-Îles" → "Sept-Ã…").
 * When Ã, Â, or U+FFFD hints at that, reinterpret code units 0–255 as bytes
 * and decode as UTF-8.
 */
const MOJIBAKE_HINT = /\u00c3|\u00c2|\ufffd/;

export function repairUtf8MojibakeIfNeeded(input: string): string {
  if (!input || !MOJIBAKE_HINT.test(input)) return input;

  const bytes = new Uint8Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    if (c > 0xff) return input;
    bytes[i] = c;
  }

  const repaired = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (repaired.includes("\ufffd")) return input;
  if (repaired.length < Math.min(3, input.length)) return input;

  return repaired;
}
