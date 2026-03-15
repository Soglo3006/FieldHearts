"use client";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { CheckCircle, X } from "lucide-react";

interface Props {
  state: "idle" | "loading" | "success" | "error";
  note: string;
  errorMsg: string;
  price: number;
  serviceTitle: string;
  providerFirstName: string;
  onNoteChange: (v: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  onMessageProvider: () => void;
}

export default function BookingModal({
  state, note, errorMsg, price, serviceTitle, providerFirstName,
  onNoteChange, onSubmit, onClose, onMessageProvider,
}: Props) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => { if (state !== "loading") onClose(); }}
      />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md z-10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{t("serviceDetail.requestBooking")}</h3>
          {state !== "loading" && (
            <button onClick={onClose} className="cursor-pointer text-gray-500 hover:text-gray-700">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {state === "success" ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-1">{t("serviceDetail.requestSent")}</h4>
            <p className="text-sm text-gray-600 mb-6">
              {t("serviceDetail.willReview", { name: providerFirstName })}
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
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="font-medium text-gray-900 text-sm mb-3 line-clamp-2">{serviceTitle}</p>
              {(() => {
                const buyerCommission = price * 0.05;
                const transactionFee  = price * 0.03;
                const gst             = price * 0.05;
                const qst             = price * 0.09975;
                const total = price + buyerCommission + transactionFee + gst + qst;
                const fmt = (n: number) => n.toFixed(2);
                return (
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t("serviceDetail.servicePrice")}</span>
                      <span className="font-semibold">${fmt(price)}</span>
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
                    <div className="flex justify-between font-bold border-t border-gray-200 pt-2">
                      <span>{t("serviceDetail.total")}</span>
                      <span className="text-green-700">${fmt(total)}</span>
                    </div>
                  </div>
                );
              })()}
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
          </>
        )}
      </div>
    </div>
  );
}
