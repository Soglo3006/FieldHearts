import webpush from "web-push";
import { supabaseAdmin } from "../lib/supabase.js";

const PUSH_ICON_URL = "https://www.uneden.ca/logo.png";
const PUSH_BADGE_URL = "https://www.uneden.ca/logo.png";

let _configured = false;

const configure = () => {
  if (_configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  _configured = true;
};

/**
 * Send a push notification to all subscriptions of a given user.
 * Silently removes expired/invalid subscriptions.
 */
export const sendPushToUser = async (userId, payload) => {
  try {
    configure();

    const { data: subs, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (error || !subs?.length) return;

    const results = await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24 } // 24h
        )
      )
    );

    // Remove subscriptions that are gone (410 Gone or 404)
    const expired = subs.filter((_, i) => {
      const r = results[i];
      if (r.status === "rejected") {
        const status = r.reason?.statusCode;
        return status === 410 || status === 404;
      }
      return false;
    });

    if (expired.length) {
      await supabaseAdmin
        .from("push_subscriptions")
        .delete()
        .in("id", expired.map((s) => s.id));
    }
  } catch (err) {
    console.error("Push notification error:", err.message);
  }
};

// ─── Helpers for each event type ─────────────────────────────────────────────

export const pushNewBooking = (workerId, clientName, serviceTitle) =>
  sendPushToUser(workerId, {
    title: "New booking request",
    body: `${clientName} wants to book "${serviceTitle}"`,
    icon: PUSH_ICON_URL,
    badge: PUSH_BADGE_URL,
    url: "/bookings",
    tag: "booking-new",
  });

export const pushBookingStatus = (clientId, status, serviceTitle) =>
  sendPushToUser(clientId, {
    title:
      status === "accepted"
        ? "Booking accepted!"
        : status === "negotiating"
          ? "Agree on price"
          : "Booking update",
    body:
      status === "accepted"
        ? `Your request for "${serviceTitle}" was accepted.`
        : status === "negotiating"
          ? `Your request for "${serviceTitle}" was accepted. Agree on a price before payment.`
          : status === "refused"
            ? `Your request for "${serviceTitle}" was declined.`
            : `Your booking for "${serviceTitle}" is now ${status}.`,
    icon: PUSH_ICON_URL,
    badge: PUSH_BADGE_URL,
    url: "/bookings",
    tag: "booking-status",
  });

function formatPushAmount(amount) {
  if (typeof amount === "string") return amount.replace(/\$/g, "").trim();
  if (typeof amount === "number" && Number.isFinite(amount)) return amount.toFixed(2);
  return String(amount ?? "");
}

export const pushPriceProposed = (recipientId, { proposerName, amount, serviceTitle }) =>
  sendPushToUser(recipientId, {
    title: "New price proposed",
    body: `${proposerName} proposed ${formatPushAmount(amount)} for "${serviceTitle}"`,
    icon: PUSH_ICON_URL,
    badge: PUSH_BADGE_URL,
    url: "/bookings",
    tag: "price-proposed",
  });

export const pushPriceConfirmRequest = (recipientId, { confirmerName, amount, serviceTitle }) =>
  sendPushToUser(recipientId, {
    title: "Confirm the agreed price",
    body: `${confirmerName} confirmed ${formatPushAmount(amount)} for "${serviceTitle}". Confirm on your side to finalize.`,
    icon: PUSH_ICON_URL,
    badge: PUSH_BADGE_URL,
    url: "/bookings",
    tag: "price-confirm",
  });

export const pushPriceAgreed = (userId, { amount, serviceTitle, awaitingPayment }) => {
  const label = formatPushAmount(amount);
  return sendPushToUser(userId, {
    title: "Price agreed",
    body: awaitingPayment
      ? `Price set at ${label} for "${serviceTitle}". Complete payment to start.`
      : `Price set at ${label} for "${serviceTitle}". Waiting for client payment.`,
    icon: PUSH_ICON_URL,
    badge: PUSH_BADGE_URL,
    url: "/bookings",
    tag: "price-agreed",
  });
};

export const pushNewMessage = (recipientId, senderName) =>
  sendPushToUser(recipientId, {
    title: "New message",
    body: `${senderName} sent you a message`,
    icon: PUSH_ICON_URL,
    badge: PUSH_BADGE_URL,
    url: "/messages",
    tag: "message-new",
  });
