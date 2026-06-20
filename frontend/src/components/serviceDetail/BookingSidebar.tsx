"use client";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { normalizePricingMode } from "@/lib/listingPrice";
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
  pricingMode?: string | null;
  serviceEstimatedHours?: number | null;
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
  pricingMode,
  serviceEstimatedHours,
  existingBookingStatus,
  contactLoading,
  onBookingRequest,
  onContact,
}: Props) {
  const { t } = useTranslation();
  return (
    <>
      {/* Booking card */}
      <div className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">
          {serviceType === "offer" ? t("serviceDetail.readyToBook") : t("serviceDetail.interested")}
        </h3>

        <div className="bg-white rounded-lg p-3 mb-6 text-sm border border-gray-100">
          <div className="flex justify-between gap-2">
            <span className="text-gray-600">
              {serviceType === "offer" ? t("serviceDetail.servicePrice") : t("serviceDetail.earnings")}
            </span>
            <span className="font-semibold text-gray-900 text-right">{displayPriceLabel}</span>
          </div>
          {normalizePricingMode(pricingMode) === "hourly" && serviceEstimatedHours != null && serviceEstimatedHours > 0 && (
            <>
              <hr className="border-gray-100 my-2" />
              <div className="flex justify-between gap-2 text-gray-500">
                <span>{t("post.estimatedHoursLabel")}</span>
                <span>~{serviceEstimatedHours} h</span>
              </div>
            </>
          )}
          {estimatedTotalBase === null && serviceType === "offer" && (
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{t("listingPrice.quoteTotalsHint")}</p>
          )}
        </div>

        <div className="space-y-2">
          <Button
            className="w-full bg-green-700 text-white hover:bg-green-800 h-12 disabled:opacity-60"
            onClick={onBookingRequest}
            disabled={existingBookingStatus !== null}
          >
            {existingBookingStatus
              ? existingBookingStatus === "pending"
                ? t("serviceDetail.requestAlreadySent")
                : existingBookingStatus === "negotiating"
                  ? t("bookings.negotiating")
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
