"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { normalizePricingMode } from "@/lib/listingPrice";
import {
  getNegotiationBounds,
  getPartyProposals,
  hasAnyPartyProposal,
  isPriceAgreementComplete,
  pricesMatch,
  canAccessPriceNegotiation,
} from "@/lib/priceNegotiation";
import { clampToRange, formatPriceInput, parsePriceInput } from "./RangePriceFields";
import {
  NegotiationCard,
  NegotiationPriceInput,
  NegotiationRow,
  PartyConfirmCard,
} from "./NegotiationCard";
import { negotiationActionButtonClass } from "./negotiationCardStyles";
import { cn } from "@/lib/utils";
import DepositFields from "@/components/post/DepositFields";
import type { DepositType } from "@/lib/deposit";

interface Booking {
  id: string;
  status: string;
  custom_price?: number | null;
  custom_price_min?: number | string | null;
  custom_price_max?: number | string | null;
  price?: number | string | null;
  price_min?: number | string | null;
  price_max?: number | string | null;
  pricing_mode?: string | null;
  deposit_enabled?: boolean;
  deposit_type?: string | null;
  deposit_value?: number | string | null;
  price_confirmed_by_client_at?: string | null;
  price_confirmed_by_worker_at?: string | null;
  client_proposed_price?: number | string | null;
  worker_proposed_price?: number | string | null;
  price_selected_by_client?: number | string | null;
  price_selected_by_worker?: number | string | null;
}

interface Props {
  booking: Booking;
  userRole: "client" | "worker";
  accessToken: string;
  onUpdated: (data: Record<string, unknown>) => void;
}

function getMyProposalAmount(
  booking: Booking,
  userRole: "client" | "worker",
  bounds: { min: number; max: number } | null,
): string {
  const proposals = getPartyProposals(booking);
  const mine = userRole === "client" ? proposals.client : proposals.worker;
  if (mine != null) return formatPriceInput(clampToRange(mine, bounds));
  if (bounds) return formatPriceInput(bounds.min);
  return "";
}

function formatAmount(amount: number | null): string {
  return amount != null ? `${amount.toFixed(2)} $` : "";
}

function ProposalCard({
  label,
  amount,
  isMine,
  isSelected,
  selectable,
  onSelect,
  youBadge,
  noProposalLabel,
  selectLabel,
  selectedLabel,
}: {
  label: string;
  amount: number | null;
  isMine: boolean;
  isSelected: boolean;
  selectable: boolean;
  onSelect: () => void;
  youBadge: string;
  noProposalLabel: string;
  selectLabel: string;
  selectedLabel: string;
}) {
  const hasAmount = amount != null;

  return (
    <button
      type="button"
      onClick={hasAmount && selectable ? onSelect : undefined}
      disabled={!hasAmount || !selectable}
      className={cn(
        "rounded-xl border px-4 py-3 text-left transition-colors w-full",
        hasAmount && selectable && "cursor-pointer hover:border-green-400",
        isSelected
          ? "border-green-600 bg-green-50 ring-1 ring-green-600"
          : "border-gray-200 bg-white",
        (!hasAmount || !selectable) && "cursor-default",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {label}
          {isMine && (
            <span className="ml-1.5 normal-case font-medium text-green-700">({youBadge})</span>
          )}
        </p>
        {isSelected && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-green-700 shrink-0">
            {selectedLabel}
          </span>
        )}
      </div>
      <p className={cn("mt-2 text-lg font-bold", hasAmount ? "text-gray-900" : "text-gray-400 text-sm font-medium")}>
        {hasAmount ? formatAmount(amount) : noProposalLabel}
      </p>
      {hasAmount && selectable && !isSelected && (
        <p className="text-xs text-gray-500 mt-2">{selectLabel}</p>
      )}
    </button>
  );
}

export default function PriceNegotiationSection({ booking, userRole, accessToken, onUpdated }: Props) {
  const { t } = useTranslation();
  const isQuote = normalizePricingMode(booking.pricing_mode) === "quote";
  const isRange = normalizePricingMode(booking.pricing_mode) === "range";
  const negotiationBounds = useMemo(() => getNegotiationBounds(booking), [booking]);
  const proposals = useMemo(() => getPartyProposals(booking), [booking]);

  const hasBookingDeposit =
    booking.deposit_type != null &&
    booking.deposit_value != null &&
    Number(booking.deposit_value) > 0;

  const [editPrice, setEditPrice] = useState(() =>
    getMyProposalAmount(booking, userRole, negotiationBounds),
  );
  const [depositEnabled, setDepositEnabled] = useState(
    () => hasBookingDeposit || booking.deposit_enabled === true,
  );
  const [depositType, setDepositType] = useState<DepositType>(
    (booking.deposit_type as DepositType) ?? "percent",
  );
  const [depositValue, setDepositValue] = useState(() =>
    hasBookingDeposit
      ? String(
          booking.deposit_type === "percent"
            ? Math.round(Number(booking.deposit_value))
            : Number(booking.deposit_value),
        )
      : "",
  );
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setEditPrice(getMyProposalAmount(booking, userRole, negotiationBounds));
  }, [
    booking.client_proposed_price,
    booking.worker_proposed_price,
    booking.custom_price,
    booking.id,
    userRole,
    negotiationBounds?.min,
    negotiationBounds?.max,
  ]);

  useEffect(() => {
    const active =
      booking.deposit_type != null &&
      booking.deposit_value != null &&
      Number(booking.deposit_value) > 0;
    setDepositEnabled(active || booking.deposit_enabled === true);
    setDepositType((booking.deposit_type as DepositType) ?? "percent");
    setDepositValue(
      active
        ? String(
            booking.deposit_type === "percent"
              ? Math.round(Number(booking.deposit_value))
              : Number(booking.deposit_value),
          )
        : "",
    );
  }, [booking.deposit_type, booking.deposit_value, booking.deposit_enabled, booking.id]);

  useEffect(() => {
    const mySelection =
      userRole === "client"
        ? booking.price_selected_by_client
        : booking.price_selected_by_worker;
    if (mySelection != null && Number(mySelection) >= 0.01) {
      setSelectedPrice(Number(mySelection));
      return;
    }
    setSelectedPrice(null);
  }, [
    booking.price_selected_by_client,
    booking.price_selected_by_worker,
    booking.id,
    userRole,
  ]);

  const clientConfirmed = Boolean(booking.price_confirmed_by_client_at);
  const workerConfirmed = Boolean(booking.price_confirmed_by_worker_at);
  const myConfirmed = userRole === "client" ? clientConfirmed : workerConfirmed;
  const otherConfirmed = userRole === "client" ? workerConfirmed : clientConfirmed;
  const legacyPrice =
    proposals.client == null &&
    proposals.worker == null &&
    booking.custom_price != null &&
    Number(booking.custom_price) >= 0.01
      ? Number(booking.custom_price)
      : null;
  const showDualProposals = proposals.client != null || proposals.worker != null || legacyPrice == null;

  const clientSelected =
    booking.price_selected_by_client != null ? Number(booking.price_selected_by_client) : null;
  const workerSelected =
    booking.price_selected_by_worker != null ? Number(booking.price_selected_by_worker) : null;
  const mySavedSelection =
    userRole === "client"
      ? clientSelected
      : workerSelected;
  const canConfirm =
    selectedPrice != null &&
    (!myConfirmed || (mySavedSelection != null && !pricesMatch(selectedPrice, mySavedSelection)));
  const canSelectProposal = !isPriceAgreementComplete(booking);

  const bothConfirmedMismatch =
    clientConfirmed &&
    workerConfirmed &&
    clientSelected != null &&
    workerSelected != null &&
    !pricesMatch(clientSelected, workerSelected);

  const selectableOptions = useMemo(() => {
    const opts: number[] = [];
    if (proposals.client != null) opts.push(proposals.client);
    if (proposals.worker != null && !opts.some((p) => pricesMatch(p, proposals.worker))) {
      opts.push(proposals.worker!);
    }
    if (
      opts.length === 0 &&
      booking.custom_price != null &&
      Number(booking.custom_price) >= 0.01
    ) {
      opts.push(Number(booking.custom_price));
    }
    return opts;
  }, [proposals.client, proposals.worker, booking.custom_price]);

  const parsedEditPrice = parsePriceInput(editPrice);
  const isPriceValid =
    parsedEditPrice != null &&
    parsedEditPrice >= 0.01 &&
    (negotiationBounds == null ||
      (parsedEditPrice >= negotiationBounds.min && parsedEditPrice <= negotiationBounds.max));

  const handlePriceBlur = () => {
    if (parsedEditPrice == null) {
      setEditPrice(getMyProposalAmount(booking, userRole, negotiationBounds));
      return;
    }
    setEditPrice(formatPriceInput(clampToRange(parsedEditPrice, negotiationBounds)));
  };

  const depositBasePrice =
    parsedEditPrice ??
    selectedPrice ??
    (booking.custom_price != null && Number(booking.custom_price) >= 0.01
      ? Number(booking.custom_price)
      : null);

  const buildDepositPayload = () => {
    if (!isQuote || userRole !== "worker") return {};
    if (!depositEnabled || !depositValue.trim()) {
      return { deposit_type: null, deposit_value: 0 };
    }
    const val = Number(depositValue);
    if (!Number.isFinite(val) || val <= 0) return {};
    return { deposit_type: depositType, deposit_value: val };
  };

  const formatDepositLabel = () => {
    if (!hasBookingDeposit && !booking.deposit_enabled) return null;
    if (!booking.deposit_value || Number(booking.deposit_value) <= 0) return null;
    return booking.deposit_type === "percent"
      ? `${Number(booking.deposit_value)} %`
      : `${Number(booking.deposit_value).toFixed(2)} $`;
  };

  const proposePrice = async () => {
    if (!isPriceValid || parsedEditPrice == null) return;
    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${booking.id}/negotiate-price`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          custom_price: clampToRange(parsedEditPrice, negotiationBounds),
          ...buildDepositPayload(),
        }),
      });
      if (!res.ok) return;
      onUpdated(await res.json());
    } finally {
      setSaving(false);
    }
  };

  const confirmPrice = async () => {
    if (selectedPrice == null) return;
    setConfirming(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${booking.id}/confirm-price`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          selected_price: selectedPrice,
          ...buildDepositPayload(),
        }),
      });
      if (!res.ok) return;
      onUpdated(await res.json());
    } finally {
      setConfirming(false);
    }
  };

  if (!canAccessPriceNegotiation(booking)) return null;

  const agreedPrice =
    booking.custom_price != null && Number(booking.custom_price) >= 0.01
      ? Number(booking.custom_price)
      : null;
  const showAgreedBanner =
    booking.status === "accepted" && agreedPrice != null && isPriceAgreementComplete(booking);

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

      {showAgreedBanner && (
        <NegotiationCard className="space-y-1">
          <NegotiationRow
            label={t("priceNegotiation.currentAgreedPrice")}
            value={formatAmount(agreedPrice)}
          />
          <p className="text-xs text-gray-500 leading-relaxed">{t("priceNegotiation.renegotiateHint")}</p>
        </NegotiationCard>
      )}

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
        {isQuote && userRole === "worker" && (
          <div className="space-y-1.5 border-t border-gray-100 pt-3">
            <p className="text-xs font-medium text-gray-700">{t("priceNegotiation.depositLabel")}</p>
            <DepositFields
              enabled={depositEnabled}
              onEnabledChange={setDepositEnabled}
              type={depositType}
              onTypeChange={setDepositType}
              value={depositValue}
              onValueChange={setDepositValue}
              pricingMode="quote"
              servicePrice={depositBasePrice}
            />
            <p className="text-xs text-gray-500 leading-relaxed">{t("priceNegotiation.depositHint")}</p>
          </div>
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

      {hasAnyPartyProposal(booking) && (
        <>
          {isQuote && userRole === "client" && formatDepositLabel() && (
            <NegotiationCard>
              <NegotiationRow
                label={t("priceNegotiation.providerDeposit")}
                value={formatDepositLabel()!}
              />
            </NegotiationCard>
          )}

          {showDualProposals ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ProposalCard
                label={t("priceNegotiation.clientProposal")}
                amount={proposals.client}
                isMine={userRole === "client"}
                isSelected={selectedPrice != null && proposals.client != null && pricesMatch(selectedPrice, proposals.client)}
                selectable={canSelectProposal && proposals.client != null}
                onSelect={() => proposals.client != null && setSelectedPrice(proposals.client)}
                youBadge={t("priceNegotiation.youBadge")}
                noProposalLabel={t("priceNegotiation.noProposalYet")}
                selectLabel={t("priceNegotiation.selectProposal")}
                selectedLabel={t("priceNegotiation.selectedProposal")}
              />
              <ProposalCard
                label={t("priceNegotiation.providerProposal")}
                amount={proposals.worker}
                isMine={userRole === "worker"}
                isSelected={selectedPrice != null && proposals.worker != null && pricesMatch(selectedPrice, proposals.worker)}
                selectable={canSelectProposal && proposals.worker != null}
                onSelect={() => proposals.worker != null && setSelectedPrice(proposals.worker)}
                youBadge={t("priceNegotiation.youBadge")}
                noProposalLabel={t("priceNegotiation.noProposalYet")}
                selectLabel={t("priceNegotiation.selectProposal")}
                selectedLabel={t("priceNegotiation.selectedProposal")}
              />
            </div>
          ) : legacyPrice != null ? (
            <NegotiationCard>
              <NegotiationRow label={t("priceNegotiation.currentPrice")} value={formatAmount(legacyPrice)} />
            </NegotiationCard>
          ) : null}

          <NegotiationCard className="space-y-2">
            <p className="text-xs text-red-500 leading-relaxed">{t("priceNegotiation.confirmBothHint")}</p>
          </NegotiationCard>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PartyConfirmCard
              label={t("bookings.clientLabel")}
              confirmed={clientConfirmed}
              isMe={userRole === "client"}
              pendingLabel={t("bookings.pending")}
              confirmedAmount={clientSelected}
            />
            <PartyConfirmCard
              label={t("bookings.providerLabel")}
              confirmed={workerConfirmed}
              isMe={userRole === "worker"}
              pendingLabel={t("bookings.pending")}
              confirmedAmount={workerSelected}
            />
          </div>

          {bothConfirmedMismatch && (
            <NegotiationCard>
              <p className="text-xs text-red-600 text-center leading-relaxed">
                {t("priceNegotiation.mismatchHint")}
              </p>
            </NegotiationCard>
          )}

          {canConfirm && selectableOptions.length > 0 && (
            <>
              {isQuote && userRole === "worker" && (
                <NegotiationCard className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-700">{t("priceNegotiation.depositLabel")}</p>
                  <DepositFields
                    enabled={depositEnabled}
                    onEnabledChange={setDepositEnabled}
                    type={depositType}
                    onTypeChange={setDepositType}
                    value={depositValue}
                    onValueChange={setDepositValue}
                    pricingMode="quote"
                    servicePrice={selectedPrice ?? depositBasePrice}
                  />
                  <p className="text-xs text-gray-500 leading-relaxed">{t("priceNegotiation.depositConfirmHint")}</p>
                </NegotiationCard>
              )}
              <Button
              size="sm"
              className={negotiationActionButtonClass}
              onClick={confirmPrice}
              disabled={confirming || selectedPrice == null}
            >
              {confirming ? "…" : t("priceNegotiation.confirmSelected")}
            </Button>
            </>
          )}
          {myConfirmed && !otherConfirmed && !bothConfirmedMismatch && !canConfirm && (
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
