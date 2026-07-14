"use client";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { normalizePricingMode } from "@/lib/listingPrice";
import { STATUS_CONFIG, type BookingStatus } from "@/components/bookings/bookingTypes";

interface Props {
  serviceType: "offer" | "looking";
  /** Preformatted line for service price / budget / range / quote. */
  displayPriceLabel: string;
  /** Null when price is “to discuss” — totals are not estimated yet. */
  estimatedTotalBase: number | null;
  /** High end of service/budget range; when set above `estimatedTotalBase`, commission/taxes/total show as ranges. */
  estimatedTotalBaseMax?: number | null;
  workerProvince?: string | null;
  providerFirstName: string;
  /** When true, use enterprise-oriented contact CTA wording where languages differ. */
  providerIsCompany: boolean;
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
  pricingMode,
  serviceEstimatedHours,
  existingBookingStatus,
  contactLoading,
  onBookingRequest,
  onContact,
  providerFirstName,
  providerIsCompany,
}: Props) {
  const { t } = useTranslation();

  const existingBookingStatusLabel =
    existingBookingStatus && existingBookingStatus in STATUS_CONFIG
      ? t(STATUS_CONFIG[existingBookingStatus as BookingStatus].labelKey)
      : existingBookingStatus;

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
                  : t("serviceDetail.bookingStatus", { status: existingBookingStatusLabel })
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
    </>
  );
}
