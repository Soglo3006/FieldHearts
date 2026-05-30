"use client";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { formatTaxRate } from "@/lib/taxes";
import { useClientTax } from "@/hooks/useClientTax";
import { Button } from "@/components/ui/button";
import { Clock, Globe, CheckCircle } from "lucide-react";
import {
  formatAvailabilityLabel,
  formatMobilityLabel,
  formatSpokenLanguageLabel,
} from "@/lib/formatServiceDetailFields";

interface Props {
  serviceType: "offer" | "looking";
  /** Preformatted line for service price / budget / range / quote. */
  displayPriceLabel: string;
  /** Null when price is “to discuss” — totals are not estimated yet. */
  estimatedTotalBase: number | null;
  /** High end of service/budget range; when set above `estimatedTotalBase`, commission/taxes/total show as ranges. */
  estimatedTotalBaseMax?: number | null;
  ownerId: string;
  workerProvince?: string | null;
  providerFirstName: string;
  /** When true, use enterprise-oriented contact CTA wording where languages differ. */
  providerIsCompany: boolean;
  availability: string | null;
  language: string | null;
  mobility: string | null;
  existingBookingStatus: string | null;
  contactLoading: boolean;
  onBookingRequest: () => void;
  onContact: () => void;
}

export default function BookingSidebar({
  serviceType,
  displayPriceLabel,
  estimatedTotalBase,
  estimatedTotalBaseMax,
  ownerId,
  workerProvince,
  providerFirstName,
  providerIsCompany,
  availability,
  language,
  mobility,
  existingBookingStatus,
  contactLoading,
  onBookingRequest,
  onContact,
}: Props) {
  const { t, i18n } = useTranslation();
  const { taxRate, taxLabel, loading: taxLoading } = useClientTax(i18n.language ?? "fr");
  const showBuyerFees = serviceType === "offer";
  return (
    <>
      {/* Booking card */}
      <div className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">
          {serviceType === "offer" ? t("serviceDetail.readyToBook") : t("serviceDetail.interested")}
        </h3>

        {estimatedTotalBase === null ? (
          <div className="bg-white rounded-lg p-3 space-y-3 mb-6 text-sm border border-gray-100">
            <div className="flex justify-between gap-2">
              <span className="text-gray-600">
                {serviceType === "offer" ? t("serviceDetail.servicePrice") : t("listings.price")}
              </span>
              <span className="font-semibold text-gray-900 text-right">{displayPriceLabel}</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">{t("listingPrice.quoteTotalsHint")}</p>
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
            const skeletonCls = "h-3.5 rounded bg-gray-200 animate-pulse";
            return (
              <div className="bg-white rounded-lg p-3 space-y-1.5 mb-6 text-sm border border-gray-100">
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">{serviceType === "offer" ? t("serviceDetail.servicePrice") : t("listings.price")}</span>
                  <span className="font-semibold text-gray-900 text-right">{displayPriceLabel}</span>
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
                        <div className="text-gray-500">{t("serviceDetail.taxes")} {!taxLoading && `(${formatTaxRate(taxRate)}%)`}</div>
                        {taxLoading
                          ? <div className={`${skeletonCls} w-28 mt-1`} />
                          : <div className="text-xs text-gray-400">{taxLabel}</div>
                        }
                      </div>
                      {taxLoading
                        ? (
                          <div className={`flex flex-col items-end gap-1 ${showRangeTotals ? "w-36" : "w-20"}`}>
                            <div className={`${skeletonCls} h-3.5 w-full`} />
                            {showRangeTotals && <div className={`${skeletonCls} h-3.5 w-full`} />}
                          </div>
                        )
                        : <span className="text-gray-700 text-right tabular-nums shrink-0">{fmtRange(taxesMin, taxesMax)}</span>
                      }
                    </div>
                    <div className="flex justify-between gap-2 text-base font-bold border-t border-gray-200 pt-2 mt-1">
                      <span>{t("serviceDetail.total")}</span>
                      {taxLoading
                        ? (
                          <div className={`flex flex-col items-end gap-1 ${showRangeTotals ? "w-40" : "w-24"}`}>
                            <div className={`${skeletonCls} h-4 w-full`} />
                            {showRangeTotals && <div className={`${skeletonCls} h-4 w-full`} />}
                          </div>
                        )
                        : <span className="text-green-700 text-right tabular-nums shrink-0">{fmtRange(totalMin, totalMax)}</span>
                      }
                    </div>
                    {showRangeTotals && (
                      <p className="text-xs text-gray-500 leading-snug pt-1">{t("serviceDetail.rangeTotalsHint")}</p>
                    )}
                  </>
                )}
              </div>
            );
          })()
        )}

        <div className="space-y-2">
          <Button
            className="w-full bg-green-700 text-white hover:bg-green-800 h-12 disabled:opacity-60"
            onClick={onBookingRequest}
            disabled={existingBookingStatus !== null}
          >
            {existingBookingStatus
              ? existingBookingStatus === "pending"
                ? t("serviceDetail.requestAlreadySent")
                : t("serviceDetail.bookingStatus", { status: existingBookingStatus })
              : serviceType === "looking"
              ? t("serviceDetail.applyToJob")
              : t("serviceDetail.requestBooking")}
          </Button>
          <Button
            variant="outline"
            className="w-full h-12"
            onClick={onContact}
            disabled={contactLoading}
          >
            {contactLoading
              ? t("serviceDetail.openingChat")
              : providerIsCompany
                ? t("serviceDetail.contactBusiness", { name: providerFirstName })
                : t("serviceDetail.contactPerson", { name: providerFirstName })}
          </Button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-3">
          {t("serviceDetail.byContinuing")}{" "}
          <Link href="/payment-terms" className="text-green-700 hover:underline">
            {t("serviceDetail.paymentTerms")}
          </Link>
        </p>
      </div>

      {/* Provider info card */}
      <div className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">{t("serviceDetail.aboutProvider", { name: providerFirstName })}</h3>
        <div className="space-y-1">
          {availability && (
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-600">{t("serviceDetail.availability")}</span>
              </div>
              <span className="max-w-32.5 truncate text-right text-sm font-semibold text-gray-900">
                {formatAvailabilityLabel(availability, t)}
              </span>
            </div>
          )}
          {language && (
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-600">{t("serviceDetail.language")}</span>
              </div>
              <span className="font-semibold text-gray-900 text-sm">{formatSpokenLanguageLabel(language, t)}</span>
            </div>
          )}
          {mobility && (
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-600">{t("serviceDetail.mobile")}</span>
              </div>
              <span className="font-semibold text-gray-900 text-sm">{formatMobilityLabel(mobility, t)}</span>
            </div>
          )}
        </div>
        <Link href={`/profile/${ownerId}`}>
          <Button variant="outline" className="w-full mt-4">
            {t("serviceDetail.viewProfile")}
          </Button>
        </Link>
      </div>
    </>
  );
}
