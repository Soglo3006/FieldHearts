"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { normalizePricingMode } from "@/lib/listingPrice";
import { getNegotiationBounds, hasProposedPrice, isPriceAgreementComplete } from "@/lib/priceNegotiation";
import { clampToRange, formatPriceInput, parsePriceInput } from "./RangePriceFields";
import {
  NegotiationCard,
  NegotiationPriceInput,
  NegotiationRow,
  PartyConfirmCard,
} from "./NegotiationCard";
import { negotiationActionButtonClass } from "./negotiationCardStyles";

interface Booking {
  id: string;
  status: string;
  custom_price?: number | null;
  custom_price_min?: number | null;
  custom_price_max?: number | null;
  price?: number | string | null;
  price_min?: number | string | null;
  price_max?: number | string | null;
  pricing_mode?: string | null;
  price_confirmed_by_client_at?: string | null;
  price_confirmed_by_worker_at?: string | null;
}

interface Props {
  booking: Booking;
  userRole: "client" | "worker";
  accessToken: string;
  onUpdated: (data: Record<string, unknown>) => void;
}

function getInitialPriceInput(booking: Booking, bounds: { min: number; max: number } | null): string {
  if (booking.custom_price != null && Number(booking.custom_price) >= 0.01) {
    return formatPriceInput(clampToRange(Number(booking.custom_price), bounds));
  }
  if (bounds) return formatPriceInput(bounds.min);
  return "";
}

export default function PriceNegotiationSection({ booking, userRole, accessToken, onUpdated }: Props) {
  const { t } = useTranslation();
  const isRange = normalizePricingMode(booking.pricing_mode) === "range";
  const negotiationBounds = useMemo(() => getNegotiationBounds(booking), [booking]);

  const [editPrice, setEditPrice] = useState(() => getInitialPriceInput(booking, negotiationBounds));
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setEditPrice(getInitialPriceInput(booking, negotiationBounds));
  }, [booking.custom_price, booking.custom_price_min, booking.custom_price_max, booking.id, negotiationBounds?.min, negotiationBounds?.max]);

  const clientConfirmed = Boolean(booking.price_confirmed_by_client_at);
  const workerConfirmed = Boolean(booking.price_confirmed_by_worker_at);
  const myConfirmed = userRole === "client" ? clientConfirmed : workerConfirmed;
  const otherConfirmed = userRole === "client" ? workerConfirmed : clientConfirmed;
  const proposed = hasProposedPrice(booking);

  const parsedEditPrice = parsePriceInput(editPrice);
  const isPriceValid =
    parsedEditPrice != null &&
    parsedEditPrice >= 0.01 &&
    (negotiationBounds == null ||
      (parsedEditPrice >= negotiationBounds.min && parsedEditPrice <= negotiationBounds.max));

  const handlePriceBlur = () => {
    if (parsedEditPrice == null) {
      setEditPrice(getInitialPriceInput(booking, negotiationBounds));
      return;
    }
    setEditPrice(formatPriceInput(clampToRange(parsedEditPrice, negotiationBounds)));
  };

  const proposePrice = async () => {
    if (!isPriceValid || parsedEditPrice == null) return;
    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${booking.id}/negotiate-price`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ custom_price: clampToRange(parsedEditPrice, negotiationBounds) }),
      });
      if (!res.ok) return;
      onUpdated(await res.json());
    } finally {
      setSaving(false);
    }
  };

  const confirmPrice = async () => {
    setConfirming(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${booking.id}/confirm-price`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return;
      onUpdated(await res.json());
    } finally {
      setConfirming(false);
    }
  };

  if (booking.status !== "negotiating" || isPriceAgreementComplete(booking)) return null;

  const proposedLabel =
    booking.custom_price != null ? `${Number(booking.custom_price).toFixed(2)} $` : "";

  const rangeDisplay =
    negotiationBounds &&
    t("listingPrice.rangeCurrency", {
      min: negotiationBounds.min.toFixed(2),
      max: negotiationBounds.max.toFixed(2),
    });

  return (
    <div className="space-y-3">
      <NegotiationCard>
        <p className="font-medium">{t("priceNegotiation.title")}</p>
        <p className="text-xs mt-1.5 text-red-500 leading-relaxed">{t("priceNegotiation.subtitle")}</p>
      </NegotiationCard>

      {isRange && rangeDisplay && (
        <NegotiationCard>
          <NegotiationRow label={t("priceNegotiation.rangeLabel")} value={rangeDisplay} />
        </NegotiationCard>
      )}

      <NegotiationCard className="space-y-3">
        <NegotiationRow label={t("priceNegotiation.proposedAmountLabel")}>
          <NegotiationPriceInput
            id="negotiatePriceInput"
            value={editPrice}
            onChange={setEditPrice}
            onBlur={handlePriceBlur}
            min={negotiationBounds?.min}
            max={negotiationBounds?.max}
            aria-label={t("priceNegotiation.pricePlaceholder")}
          />
        </NegotiationRow>
        {editPrice.trim() !== "" && !isPriceValid && negotiationBounds && (
          <p className="text-xs text-red-500 leading-relaxed">
            {t("priceNegotiation.outOfRange", {
              min: negotiationBounds.min.toFixed(2),
              max: negotiationBounds.max.toFixed(2),
            })}
          </p>
        )}
        <Button
          size="sm"
          className={negotiationActionButtonClass}
          onClick={proposePrice}
          disabled={saving || !isPriceValid}
        >
          {saving ? "…" : t("priceNegotiation.propose")}
        </Button>
      </NegotiationCard>

      {proposed && (
        <>
          <NegotiationCard className="space-y-2">
            <NegotiationRow label={t("priceNegotiation.currentPrice")} value={proposedLabel} />
            <p className="text-xs text-red-500 leading-relaxed">{t("priceNegotiation.confirmBothHint")}</p>
          </NegotiationCard>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PartyConfirmCard
              label={t("bookings.clientLabel")}
              confirmed={clientConfirmed}
              isMe={userRole === "client"}
              pendingLabel={t("bookings.pending")}
            />
            <PartyConfirmCard
              label={t("bookings.providerLabel")}
              confirmed={workerConfirmed}
              isMe={userRole === "worker"}
              pendingLabel={t("bookings.pending")}
            />
          </div>

          {!myConfirmed && (
            <Button
              size="sm"
              className={negotiationActionButtonClass}
              onClick={confirmPrice}
              disabled={confirming}
            >
              {confirming ? "…" : t("priceNegotiation.confirm")}
            </Button>
          )}
          {myConfirmed && !otherConfirmed && (
            <NegotiationCard>
              <p className="text-xs text-gray-600 text-center leading-relaxed">
                {t("priceNegotiation.waitingOtherParty")}
              </p>
            </NegotiationCard>
          )}
        </>
      )}
    </div>
  );
}
