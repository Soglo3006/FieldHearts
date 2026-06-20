/** Styles partagés — négociation de prix (modal + cartes) */
export const negotiationCardClass =
  "rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800";

export const negotiationHintPrimary =
  "rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs text-gray-800 leading-relaxed mb-3";

export const negotiationHintAction =
  "block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs text-gray-800 text-center leading-relaxed";

export const negotiationRowClass = "flex items-center justify-between gap-3 min-h-[2.25rem]";

export const negotiationLabelClass = "font-medium text-gray-800 min-w-0";

export const negotiationValueClass = "font-semibold text-gray-900 whitespace-nowrap shrink-0 tabular-nums";

export const negotiationPriceInputClass =
  "w-[7.5rem] shrink-0 rounded-lg border border-gray-200 bg-white pl-7 pr-3 py-2 text-sm font-semibold text-gray-900 text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

export const negotiationActionButtonClass =
  "w-full bg-green-700 hover:bg-green-800 text-white";

export function partyConfirmCardClass(confirmed: boolean, isMe: boolean): string {
  const base = `${negotiationCardClass} transition-colors`;
  if (confirmed) return `${base} border-green-200 bg-green-50/60`;
  if (isMe) return `${base} border-gray-300 bg-white ring-1 ring-green-600/15`;
  return base;
}
