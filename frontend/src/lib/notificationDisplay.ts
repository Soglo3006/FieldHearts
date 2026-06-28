import type { AppNotification } from "@/hooks/useNotifications";

function extractBookingIdFromLink(link: string | null | undefined): string | null {
  if (!link) return null;
  const match = link.match(/[?&]booking=([^&]+)/);
  return match?.[1] ?? null;
}

/** Avoid showing raw "undefined" in stored notification bodies. */
export function displayNotificationBody(
  notif: AppNotification,
  t: (key: string, opts?: { title?: string }) => string,
): string {
  const body = notif.body ?? "";
  if (!/\bundefined\b/i.test(body)) return body;

  if (notif.type === "booking_completed") {
    const titleMatch =
      body.match(/"([^"]+)"/) ??
      body.match(/«\s*([^»]+)\s*»/);
    const title = titleMatch?.[1]?.trim();
    if (title && title.toLowerCase() !== "undefined") {
      return t("notifications.bookingCompletedBody", { title });
    }
    return t("notifications.bookingCompletedBodyGeneric");
  }

  return body
    .replace(/"undefined"/g, t("notifications.unknownListing"))
    .replace(/«\s*undefined\s*»/g, t("notifications.unknownListing"));
}

export function displayNotificationLink(notif: AppNotification): string | null {
  if (notif.link && notif.link !== "/bookings") return notif.link;
  const bookingId = extractBookingIdFromLink(notif.link);
  if (bookingId) return `/bookings?booking=${bookingId}`;
  return notif.link;
}
