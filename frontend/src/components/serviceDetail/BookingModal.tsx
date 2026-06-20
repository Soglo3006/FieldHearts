"use client";
import { useTranslation } from "react-i18next";
import { useScrollLock } from "@/hooks/useScrollLock";
import { formatTaxRate, getTaxRate, getTaxLabel } from "@/lib/taxes";
import { useClientTax } from "@/hooks/useClientTax";
import { Button } from "@/components/ui/button";
import { CheckCircle, X } from "lucide-react";
import Link from "next/link";
import { getLanguageCode } from "@/lib/locale";

interface Props {
  state: "idle" | "loading" | "success" | "error";
  note: string;
  errorMsg: string;
  serviceType: "offer" | "looking";
  displayPriceLabel: string;
  estimatedTotalBase: number | null;
  estimatedTotalBaseMax?: number | null;
  serviceTitle: string;
  providerFirstName: string;
  workerProvince?: string | null;
  pricingMode?: string | null;
  hourlyRate?: number | null;
  estimatedHours?: string;
  onEstimatedHoursChange?: (v: string) => void;
  onNoteChange: (v: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  onMessageProvider: () => void;
}

export default function BookingModal({
  state,
  note,
  errorMsg,
  serviceType,
  displayPriceLabel,
  estimatedTotalBase,
  estimatedTotalBaseMax,
  serviceTitle,
  providerFirstName,
  workerProvince,
  pricingMode,
  hourlyRate,
  estimatedHours = "",
  onEstimatedHoursChange,
  onNoteChange,
  onSubmit,
  onClose,
  onMessageProvider,
}: Props) {
  const { t, i18n } = useTranslation();
  useScrollLock(true);
  const lang = getLanguageCode(i18n.language);
  const profileTax = useClientTax(lang);
  // Buyer province: client on offers (logged-in user), listing owner on "looking" searches
  const buyerProvince =
    serviceType === "looking" ? workerProvince : profileTax.province;
  const taxRate =
    buyerProvince != null && buyerProvince !== ""
      ? getTaxRate(buyerProvince)
      : profileTax.taxRate;
  const taxLabel =
    buyerProvince != null && buyerProvince !== ""
      ? getTaxLabel(buyerProvince, lang)
      : profileTax.taxLabel;
  const showBuyerFees = true;
  const isHourly = String(pricingMode ?? "").toLowerCase() === "hourly";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => { if (state !== "loading") onClose(); }}
      />
      <div className="relative bg-white rounded-3xl shadow-xl w-full max-w-md z-10 max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">{t("serviceDetail.requestBooking")}</h3>
          {state !== "loading" && (
            <button type="button" title={t("serviceDetail.close")} onClick={onClose} className="cursor-pointer text-gray-500 hover:text-gray-700">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="overflow-y-auto flex-1 px-6 pb-6">

        {state === "success" ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-1">{t("serviceDetail.requestSent")}</h4>
            <p className="text-sm text-gray-600 mb-6">
              {t("serviceDetail.willReview")}
            </p>
            <div className="space-y-2">
              <Button
                className="w-full bg-green-700 text-white hover:bg-green-800"
                onClick={onMessageProvider}
              >
                {t("serviceDetail.messageProvider", { name: providerFirstName })}
              </Button>
              <Button variant="outline" className="w-full" onClick={onClose}>
                {t("serviceDetail.close")}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg p-4 mb-4 border border-gray-100">
              <p className="font-medium text-gray-900 text-sm mb-3 line-clamp-2">{serviceTitle}</p>
              {isHourly ? (() => {
                const fmt = (n: number) => n.toFixed(2);
                const hours = Number(estimatedHours);
                const hasHours = hourlyRate != null && hours > 0;
                const base = hasHours ? hourlyRate! * hours : null;
                const commission = base != null ? base * 0.05 : null;
                const taxes = base != null ? base * taxRate : null;
                const total = base != null ? base + commission! + taxes! : null;
                return (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-2 items-center">
                      <span className="text-gray-600">{t("serviceDetail.servicePrice")}</span>
                      <span className="font-semibold">{displayPriceLabel}</span>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">
                        {t("post.estimatedHoursLabel")}{" "}
                        <span className="text-gray-400">{t("serviceDetail.optional")}</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={estimatedHours}
                        onChange={(e) => onEstimatedHoursChange?.(e.target.value)}
                        placeholder="2"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-600 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        disabled={state === "loading"}
                      />
                      <p className="text-xs text-gray-400 mt-1">{t("post.estimatedHoursHint")}</p>
                    </div>
                    {hasHours && base != null && (
                      <>
                        <div className="border-t border-gray-100 pt-2 space-y-1.5">
                          <div className="flex justify-between gap-2">
                            <span className="text-gray-500">{fmt(hourlyRate!)} $/h × {hours} h</span>
                            <span className="text-gray-700 tabular-nums">{fmt(base)} $</span>
                          </div>
                          {showBuyerFees && (
                            <>
                              <div className="flex justify-between gap-2">
                                <div>
                                  <div className="text-gray-500">{t("serviceDetail.buyerCommission")}</div>
                                  <div className="text-xs text-red-500">{t("payment.nonRefundable")}</div>
                                </div>
                                <span className="text-gray-700 tabular-nums shrink-0">{fmt(commission!)} $</span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <div>
                                  <div className="text-gray-500">{t("serviceDetail.taxes")} ({formatTaxRate(taxRate)}%)</div>
                                  <div className="text-xs text-gray-400">{taxLabel}</div>
                                </div>
                                <span className="text-gray-700 tabular-nums shrink-0">{fmt(taxes!)} $</span>
                              </div>
                              <div className="flex justify-between gap-2 font-bold border-t border-gray-200 pt-2">
                                <span>{t("serviceDetail.total")}</span>
                                <span className="text-green-700 tabular-nums shrink-0">{fmt(total!)} $</span>
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })() : estimatedTotalBase === null ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-600">
                      {serviceType === "offer" ? t("serviceDetail.servicePrice") : t("serviceDetail.earnings")}
                    </span>
                    <span className="font-semibold text-right">{displayPriceLabel}</span>
                  </div>
                  {serviceType === "offer" && (
                    <p className="text-xs text-gray-600 leading-relaxed">{t("listingPrice.quoteTotalsHint")}</p>
                  )}
                </div>
              ) : (
                (() => {
                  const minB = estimatedTotalBase;
                  const maxB = estimatedTotalBaseMax ?? minB;
                  const showRangeTotals =
                    minB != null &&
                    estimatedTotalBaseMax != null &&
                    estimatedTotalBaseMax > minB + 0.001;
                  const buyerCommissionMin = minB * 0.05;
                  const buyerCommissionMax = maxB * 0.05;
                  const taxesMin = minB * taxRate;
                  const taxesMax = maxB * taxRate;
                  const totalMin = minB + buyerCommissionMin + taxesMin;
                  const totalMax = maxB + buyerCommissionMax + taxesMax;
                  const fmt = (n: number) => n.toFixed(2);
                  const fmtRange = (lo: number, hi: number) =>
                    showRangeTotals && hi > lo + 0.001 ? `${fmt(lo)} $ – ${fmt(hi)} $` : `${fmt(lo)} $`;
                  return (
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="text-gray-600">
                          {serviceType === "offer" ? t("serviceDetail.servicePrice") : t("serviceDetail.earnings")}
                        </span>
                        <span className="font-semibold text-right">{displayPriceLabel}</span>
                      </div>
                      {showBuyerFees && (
                        <>
                          <div className="flex justify-between gap-2">
                            <div>
                              <div className="text-gray-500">{t("serviceDetail.buyerCommission")}</div>
                              <div className="text-xs text-red-500">{t("payment.nonRefundable")}</div>
                            </div>
                            <span className="text-gray-700 text-right tabular-nums shrink-0">{fmtRange(buyerCommissionMin, buyerCommissionMax)}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <div>
                              <div className="text-gray-500">{t("serviceDetail.taxes")} ({formatTaxRate(taxRate)}%)</div>
                              <div className="text-xs text-gray-400">{taxLabel}</div>
                            </div>
                            <span className="text-gray-700 text-right tabular-nums shrink-0">{fmtRange(taxesMin, taxesMax)}</span>
                          </div>
                          <div className="flex justify-between gap-2 font-bold border-t border-gray-200 pt-2">
                            <span>{t("serviceDetail.total")}</span>
                            <span className="text-green-700 text-right tabular-nums shrink-0">{fmtRange(totalMin, totalMax)}</span>
                          </div>
                          {showRangeTotals && (
                            <p className="text-xs text-gray-500 leading-snug">{t("serviceDetail.rangeTotalsHint")}</p>
                          )}
                        </>
                      )}
                    </div>
                  );
                })()
              )}
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                {t("serviceDetail.describeRequest")} <span className="text-gray-400 font-normal">{t("serviceDetail.optional")}</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => onNoteChange(e.target.value)}
                placeholder={t("serviceDetail.describeWhatYouNeed", { name: providerFirstName })}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent resize-none"
                disabled={state === "loading"}
              />
            </div>

            {state === "error" && (
              <p className="text-sm text-red-600 mb-3">{errorMsg}</p>
            )}

            <div className="space-y-2">
              <Button
                className="w-full bg-green-700 text-white hover:bg-green-800 h-11"
                onClick={onSubmit}
                disabled={state === "loading"}
              >
                {state === "loading" ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t("serviceDetail.sending")}
                  </span>
                ) : t("serviceDetail.sendRequest")}
              </Button>
              <Button
                variant="outline"
                className="w-full h-11"
                onClick={onClose}
                disabled={state === "loading"}
              >
                {t("serviceDetail.cancel")}
              </Button>
            </div>
            <p className="text-center text-xs text-gray-400 mt-3">
              {t("serviceDetail.byContinuing")}{" "}
              <Link href="/payment-terms" className="text-green-700 hover:underline">
                {t("serviceDetail.paymentTerms")}
              </Link>
            </p>
          </>
        )}
        </div>
      </div>
    </div>
  );
}
