import type { AppNotification } from "@/hooks/useNotifications";

type TFn = (key: string, opts?: Record<string, string>) => string;

function extractBookingIdFromLink(link: string | null | undefined): string | null {
  if (!link) return null;
  const match = link.match(/[?&]booking=([^&]+)/);
  return match?.[1] ?? null;
}

function extractQuotedTitle(notif: AppNotification): string | undefined {
  const body = notif.body ?? "";
  const quoted =
    body.match(/"([^"]+)"/)?.[1]?.trim() ??
    body.match(/«\s*([^»]+)\s*»/)?.[1]?.trim() ??
    notif.service_title?.trim();
  if (!quoted || quoted.toLowerCase() === "undefined") return undefined;
  return quoted;
}

function safeListingTitle(notif: AppNotification, t: TFn): string {
  return extractQuotedTitle(notif) ?? t("notifications.unknownListing");
}

function extractPaymentAmount(body: string): string | null {
  const dollarFirst = body.match(/\$\s*([\d]+(?:[.,]\d{1,2})?)/);
  if (dollarFirst) return dollarFirst[1].replace(",", ".");
  const dollarAfter = body.match(/([\d]+(?:[.,]\d{1,2})?)\s*\$/);
  if (dollarAfter) return dollarAfter[1].replace(",", ".");
  return null;
}

function extractHours(body: string): string | null {
  const match = body.match(/([\d]+(?:[.,]\d+)?)\s*h/i);
  return match?.[1]?.replace(",", ".") ?? null;
}

function extractPersonName(body: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return null;
}

function extractFieldsList(body: string): string | null {
  const colonIdx = body.lastIndexOf(":");
  if (colonIdx === -1) return null;
  const fields = body.slice(colonIdx + 1).replace(/\.$/, "").trim();
  return fields || null;
}

function isPriceAgreedProceed(titleText: string): boolean {
  return (
    (/price agreed/i.test(titleText) && /proceed to pay/i.test(titleText)) ||
    (/prix convenu/i.test(titleText) && /procédez au paiement/i.test(titleText))
  );
}

function isPriceAgreedAwaiting(titleText: string): boolean {
  return (
    (/price agreed/i.test(titleText) && /awaiting payment/i.test(titleText)) ||
    (/prix convenu/i.test(titleText) && /attente du paiement/i.test(titleText))
  );
}

function isPriceConfirmation(titleText: string, body: string): boolean {
  return (
    /price confirmation received/i.test(titleText) ||
    /confirmation de prix reçue/i.test(titleText) ||
    /confirmed the price/i.test(body) ||
    /confirmé le prix/i.test(body)
  );
}

function isNegotiatingAcceptance(titleText: string, body: string): boolean {
  return (
    /agree on a price/i.test(body) ||
    /convenez d['’]un prix/i.test(body) ||
    /match confirmed/i.test(titleText) ||
    /accord trouvé/i.test(titleText)
  );
}

function extractSenderName(notif: AppNotification): string | null {
  const explicit = notif.sender_name?.trim();
  if (explicit) return explicit;

  const title = (notif.title ?? "").trim();
  const match =
    title.match(/^New message from (.+)$/i) ??
    title.match(/^Nouveau message de (.+)$/i);

  return match?.[1]?.trim() ?? null;
}

function formatCurrency(amount: string): string {
  const normalized = amount.replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value)) return amount;
  return value.toFixed(2);
}

/** Re-render stored notification titles in the active UI language. */
export function displayNotificationTitle(notif: AppNotification, t: TFn): string {
  const titleText = notif.title ?? "";
  const body = notif.body ?? "";

  if (notif.type === "message") {
    const senderName = extractSenderName(notif);
    return senderName
      ? t("notifications.newMessageFrom", { name: senderName })
      : t("notifications.newMessage");
  }

  if (notif.type === "payment") {
    if (/balance due|solde à payer/i.test(titleText)) return t("notifications.balanceDueTitle");
    if (/refund processed|remboursement effectué/i.test(titleText)) {
      return t("notifications.refundProcessedTitle");
    }
    if (/partial refund|remboursement partiel/i.test(titleText)) {
      return t("notifications.partialRefundTitle");
    }
    return t("notifications.paymentReceived");
  }

  if (notif.type === "booking_completed") {
    return t("notifications.bookingCompletedTitle");
  }

  if (notif.type === "work_session") {
    if (/hours contested|heures contestées/i.test(titleText)) {
      return t("notifications.hoursContestedTitle");
    }
    if (/hours modified|heures modifiées/i.test(titleText)) {
      return t("notifications.hoursModifiedTitle");
    }
    return t("notifications.hoursSubmittedTitle");
  }

  if (notif.type === "dispute") {
    if (/complaint opened|plainte ouverte/i.test(titleText)) {
      return t("notifications.complaintOpenedTitle");
    }
    if (/dispute rejected|litige rejeté/i.test(titleText)) {
      return t("notifications.disputeRejectedTitle");
    }
    if (/dispute resolved|litige résolu/i.test(titleText)) {
      return t("notifications.disputeResolvedTitle");
    }
  }

  if (notif.type === "booking_cancelled") {
    return t("notifications.bookingCancelledTitle");
  }

  if (notif.type === "booking_request") {
    if (isPriceAgreedProceed(titleText)) return t("notifications.priceAgreedProceedTitle");
    if (isPriceAgreedAwaiting(titleText)) return t("notifications.priceAgreedAwaitingTitle");
    if (isPriceConfirmation(titleText, body)) {
      return t("notifications.priceConfirmationReceivedTitle");
    }
    if (/new price proposed|nouveau prix proposé/i.test(titleText)) {
      return t("notifications.newPriceProposedTitle");
    }
    if (/request details updated|détails de la demande/i.test(titleText)) {
      return t("notifications.requestDetailsUpdatedTitle");
    }
    if (/confirmation cancelled|confirmation annulée/i.test(titleText)) {
      return t("notifications.confirmationCancelledTitle");
    }
    return t("notifications.newBooking");
  }

  if (notif.type === "booking_accepted") {
    return isNegotiatingAcceptance(titleText, body)
      ? t("notifications.matchConfirmedTitle")
      : t("notifications.bookingAccepted");
  }

  if (notif.type === "booking_rejected") {
    if (/cancellation declined|annulation refusée/i.test(titleText)) {
      return t("notifications.cancellationDeclinedTitle");
    }
    if (/no longer available|non disponible/i.test(titleText)) {
      return t("notifications.requestNoLongerAvailableTitle");
    }
    return t("notifications.bookingDeclined");
  }

  return notif.title;
}

/** Re-render stored notification bodies in the active UI language. */
export function displayNotificationBody(notif: AppNotification, t: TFn): string {
  const body = notif.body ?? "";
  const titleText = notif.title ?? "";
  const safeTitle = safeListingTitle(notif, t);

  if (notif.type === "message") {
    if (/you have a new message|vous avez un nouveau message/i.test(body)) {
      return t("notifications.newMessageBody");
    }
    return body;
  }

  if (notif.type === "payment") {
    const amount = extractPaymentAmount(body);
    const formattedAmount = amount ? formatCurrency(amount) : null;

    if (/balance due|solde à payer|balance payment|solde de/i.test(body + titleText)) {
      if (formattedAmount) {
        return t("notifications.balanceDueBody", { title: safeTitle, amount: formattedAmount });
      }
    }
    if (/refund processed|remboursement effectué|refund of|remboursement de/i.test(body)) {
      if (formattedAmount) {
        return t("notifications.refundProcessedBody", { amount: formattedAmount });
      }
    }
    if (/partial refund|remboursement partiel|approved hours were less/i.test(body)) {
      if (formattedAmount) {
        return t("notifications.partialRefundBody", {
          title: safeTitle,
          amount: formattedAmount,
        });
      }
    }
    if (/received|reçu/i.test(body)) {
      if (formattedAmount && safeTitle !== t("notifications.unknownListing")) {
        return t("notifications.paymentReceivedBody", {
          title: safeTitle,
          amount: formattedAmount,
        });
      }
      if (formattedAmount) {
        return t("notifications.paymentReceivedBodyGeneric", { amount: formattedAmount });
      }
    }
  }

  if (notif.type === "booking_completed") {
    if (extractQuotedTitle(notif)) {
      return t("notifications.bookingCompletedBody", { title: safeTitle });
    }
    return t("notifications.bookingCompletedBodyGeneric");
  }

  if (notif.type === "work_session") {
    const hours = extractHours(body);
    if (/contested|contesté/i.test(body) || /hours contested|heures contestées/i.test(titleText)) {
      return t("notifications.hoursContestedBody", { title: safeTitle });
    }
    if (/adjusted|ajusté/i.test(body) || /hours modified|heures modifiées/i.test(titleText)) {
      if (hours) {
        return t("notifications.hoursModifiedBody", { title: safeTitle, hours });
      }
    }
    if (hours) {
      return t("notifications.hoursSubmittedBody", { title: safeTitle, hours });
    }
  }

  if (notif.type === "dispute") {
    if (/opened a complaint|ouvert une plainte/i.test(body)) {
      const name = extractPersonName(body, [
        /^(.+?) opened a complaint/i,
        /^(.+?) a ouvert une plainte/i,
      ]);
      if (name) return t("notifications.complaintOpenedBody", { name });
    }
    if (
      /^a decision has been added to your dispute\.?$/i.test(body.trim()) ||
      /^une décision a été ajoutée à votre litige\.?$/i.test(body.trim())
    ) {
      return t("notifications.disputeDecisionBody");
    }
  }

  if (notif.type === "booking_cancelled") {
    const name = extractPersonName(body, [
      /^(.+?) cancelled "/i,
      /^(.+?) a annulé «/i,
    ]);
    if (name) {
      return t("notifications.bookingCancelledBody", { name, title: safeTitle });
    }
  }

  if (notif.type === "booking_request") {
    if (isPriceAgreedProceed(titleText)) {
      return t("notifications.priceAgreedProceedBody", { title: safeTitle });
    }
    if (isPriceAgreedAwaiting(titleText)) {
      return t("notifications.priceAgreedAwaitingBody", { title: safeTitle });
    }
    if (isPriceConfirmation(titleText, body)) {
      return t("notifications.priceConfirmationReceivedBody", { title: safeTitle });
    }
    if (/new price proposed|nouveau prix proposé|price of|prix de/i.test(body + titleText)) {
      const amount = extractPaymentAmount(body);
      if (amount) {
        return t("notifications.newPriceProposedBody", {
          title: safeTitle,
          amount: formatCurrency(amount),
        });
      }
    }
    if (/modified in|a été modifiée/i.test(body)) {
      const fields = extractFieldsList(body);
      if (fields) {
        return t("notifications.requestDetailsUpdatedBody", { title: safeTitle, fields });
      }
    }
    if (/cancelled their completion|annulé sa confirmation/i.test(body)) {
      const name = extractPersonName(body, [
        /^(.+?) cancelled their completion/i,
        /^(.+?) a annulé sa confirmation/i,
      ]);
      if (name) {
        return t("notifications.confirmationCancelledBody", { name, title: safeTitle });
      }
    }
    const applicantName = extractPersonName(body, [
      /^(.+?) applied to your listing/i,
      /^(.+?) a postulé pour votre annonce/i,
    ]);
    if (applicantName) {
      return t("notifications.newBookingBody", { name: applicantName, title: safeTitle });
    }
  }

  if (notif.type === "booking_accepted") {
    if (isNegotiatingAcceptance(titleText, body)) {
      return t("notifications.matchConfirmedBody", { title: safeTitle });
    }
    return t("notifications.bookingAcceptedBody", { title: safeTitle });
  }

  if (notif.type === "booking_rejected") {
    if (/declined your cancellation|refusé votre demande d'annulation/i.test(body)) {
      return t("notifications.cancellationDeclinedBody");
    }
    if (/no longer available|closed —|fermée —|non disponible/i.test(body + titleText)) {
      return t("notifications.requestNoLongerAvailableBody", { title: safeTitle });
    }
    return t("notifications.bookingDeclinedBody", { title: safeTitle });
  }

  if (/\bundefined\b/i.test(body)) {
    return body
      .replace(/"undefined"/g, t("notifications.unknownListing"))
      .replace(/«\s*undefined\s*»/g, t("notifications.unknownListing"));
  }

  return body;
}

export function displayNotificationLink(notif: AppNotification): string | null {
  if (notif.link && notif.link !== "/bookings") return notif.link;
  const bookingId = extractBookingIdFromLink(notif.link);
  if (bookingId) return `/bookings?booking=${bookingId}`;
  return notif.link;
}
