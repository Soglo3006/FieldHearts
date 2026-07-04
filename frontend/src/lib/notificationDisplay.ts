import type { AppNotification } from "@/hooks/useNotifications";

function extractBookingIdFromLink(link: string | null | undefined): string | null {
  if (!link) return null;
  const match = link.match(/[?&]booking=([^&]+)/);
  return match?.[1] ?? null;
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

/** Avoid showing raw "undefined" in stored notification bodies. */
export function displayNotificationBody(
  notif: AppNotification,
  t: (key: string, opts?: { title?: string }) => string,
): string {
  const body = notif.body ?? "";
  const titleText = notif.title ?? "";
  const quotedTitle =
    body.match(/"([^"]+)"/)?.[1]?.trim() ??
    body.match(/«\s*([^»]+)\s*»/)?.[1]?.trim() ??
    notif.service_title?.trim() ??
    undefined;
  const safeTitle = quotedTitle && quotedTitle.toLowerCase() !== "undefined"
    ? quotedTitle
    : t("notifications.unknownListing");

  if (notif.type === "booking_request") {
    const isPriceAgreedProceed =
      /price agreed/i.test(titleText) &&
      /proceed to pay/i.test(titleText) ||
      /prix convenu/i.test(titleText) &&
      /procédez au paiement/i.test(titleText);
    const isPriceAgreedAwaiting =
      /price agreed/i.test(titleText) &&
      /awaiting payment/i.test(titleText) ||
      /prix convenu/i.test(titleText) &&
      /attente du paiement/i.test(titleText);
    const isPriceConfirmation =
      /price confirmation received/i.test(titleText) ||
      /confirmation de prix reçue/i.test(titleText) ||
      /confirmed the price/i.test(body) ||
      /confirmé le prix/i.test(body);

    if (isPriceAgreedProceed) {
      return t("notifications.priceAgreedProceedBody", { title: safeTitle });
    }
    if (isPriceAgreedAwaiting) {
      return t("notifications.priceAgreedAwaitingBody", { title: safeTitle });
    }
    if (isPriceConfirmation) {
      return t("notifications.priceConfirmationReceivedBody", { title: safeTitle });
    }
  }

  if (notif.type === "booking_accepted") {
    const isNegotiating =
      /agree on a price/i.test(body) ||
      /convenez d['’]un prix/i.test(body) ||
      /match confirmed/i.test(titleText) ||
      /accord trouvé/i.test(titleText);

    if (isNegotiating) {
      return t("notifications.matchConfirmedBody", { title: safeTitle });
    }
    return t("notifications.bookingAcceptedBody", { title: safeTitle });
  }

  if (notif.type === "booking_rejected") {
    return t("notifications.bookingDeclinedBody", { title: safeTitle });
  }

  if (!/\bundefined\b/i.test(body)) return body;

  if (notif.type === "booking_completed") {
    const title = quotedTitle;
    if (title && title.toLowerCase() !== "undefined") {
      return t("notifications.bookingCompletedBody", { title });
    }
    return t("notifications.bookingCompletedBodyGeneric");
  }

  return body
    .replace(/"undefined"/g, t("notifications.unknownListing"))
    .replace(/«\s*undefined\s*»/g, t("notifications.unknownListing"));
}

export function displayNotificationTitle(
  notif: AppNotification,
  t: (key: string, opts?: { name?: string }) => string,
): string {
  if (notif.type === "message") {
    const senderName = extractSenderName(notif);
    return senderName
      ? t("notifications.newMessageFrom", { name: senderName })
      : t("notifications.newMessage");
  }

  if (notif.type === "booking_request") {
    const titleText = notif.title ?? "";
    const isPriceAgreedProceed =
      /price agreed/i.test(titleText) &&
      /proceed to pay/i.test(titleText) ||
      /prix convenu/i.test(titleText) &&
      /procédez au paiement/i.test(titleText);
    const isPriceAgreedAwaiting =
      /price agreed/i.test(titleText) &&
      /awaiting payment/i.test(titleText) ||
      /prix convenu/i.test(titleText) &&
      /attente du paiement/i.test(titleText);
    const isPriceConfirmation =
      /price confirmation received/i.test(titleText) ||
      /confirmation de prix reçue/i.test(titleText);

    if (isPriceAgreedProceed) return t("notifications.priceAgreedProceedTitle");
    if (isPriceAgreedAwaiting) return t("notifications.priceAgreedAwaitingTitle");
    if (isPriceConfirmation) return t("notifications.priceConfirmationReceivedTitle");
  }

  if (notif.type === "booking_accepted") {
    const isNegotiating =
      /agree on a price/i.test(notif.body ?? "") ||
      /convenez d['’]un prix/i.test(notif.body ?? "") ||
      /match confirmed/i.test(notif.title ?? "") ||
      /accord trouvé/i.test(notif.title ?? "");

    return isNegotiating
      ? t("notifications.matchConfirmedTitle")
      : t("notifications.bookingAccepted");
  }

  if (notif.type === "booking_rejected") {
    return t("notifications.bookingDeclined");
  }

  return notif.title;
}

export function displayNotificationLink(notif: AppNotification): string | null {
  if (notif.link && notif.link !== "/bookings") return notif.link;
  const bookingId = extractBookingIdFromLink(notif.link);
  if (bookingId) return `/bookings?booking=${bookingId}`;
  return notif.link;
}
