"use client";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Clock, Globe, CheckCircle } from "lucide-react";

interface Props {
  serviceType: "offer" | "looking";
  price: number;
  ownerId: string;
  providerFirstName: string;
  availability: string | null;
  language: string | null;
  mobility: string | null;
  existingBookingStatus: string | null;
  contactLoading: boolean;
  onBookingRequest: () => void;
  onContact: () => void;
}

export default function BookingSidebar({
  serviceType, price, ownerId, providerFirstName,
  availability, language, mobility,
  existingBookingStatus, contactLoading,
  onBookingRequest, onContact,
}: Props) {
  const { t } = useTranslation();
  return (
    <>
      {/* Booking card */}
      <div className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">
          {serviceType === "offer" ? t("serviceDetail.readyToBook") : t("serviceDetail.interested")}
        </h3>

        {(() => {
          const buyerCommission  = price * 0.05;
          const transactionFee   = price * 0.03;
          const gst              = price * 0.05;
          const qst              = price * 0.09975;
          const total = price + buyerCommission + transactionFee + gst + qst;
          const fmt = (n: number) => n.toFixed(2);
          return (
            <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 mb-6 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{serviceType === "offer" ? t("serviceDetail.servicePrice") : t("serviceDetail.budget")}</span>
                <span className="font-semibold text-gray-900">${fmt(price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t("serviceDetail.buyerCommission")}</span>
                <span className="text-gray-700">${fmt(buyerCommission)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t("serviceDetail.transactionFee")}</span>
                <span className="text-gray-700">${fmt(transactionFee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t("serviceDetail.gst")}</span>
                <span className="text-gray-700">${fmt(gst)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t("serviceDetail.qst")}</span>
                <span className="text-gray-700">${fmt(qst)}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2 mt-1">
                <span>{t("serviceDetail.total")}</span>
                <span className="text-green-700">${fmt(total)}</span>
              </div>
            </div>
          );
        })()}

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
            {contactLoading ? t("serviceDetail.openingChat") : t("serviceDetail.contact", { name: providerFirstName })}
          </Button>
        </div>
      </div>

      {/* Provider info card */}
      <div className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">{t("serviceDetail.aboutProvider", { name: providerFirstName })}</h3>
        <div className="space-y-1">
          {availability && (
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <span className="text-sm text-gray-600">{t("serviceDetail.availability")}</span>
              </div>
              <span className="font-semibold text-gray-900 text-sm text-right max-w-[130px] truncate">
                {availability}
              </span>
            </div>
          )}
          {language && (
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-green-500" />
                <span className="text-sm text-gray-600">{t("serviceDetail.language")}</span>
              </div>
              <span className="font-semibold text-gray-900 text-sm">{language}</span>
            </div>
          )}
          {mobility && (
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm text-gray-600">{t("serviceDetail.mobile")}</span>
              </div>
              <span className="font-semibold text-gray-900 text-sm">{mobility}</span>
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
