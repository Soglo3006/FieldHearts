import { describe, expect, it } from "vitest";
import type { AppNotification } from "@/hooks/useNotifications";
import { displayNotificationBody, displayNotificationTitle } from "./notificationDisplay";

const en: Record<string, string> = {
  "notifications.paymentReceived": "Payment received",
  "notifications.paymentReceivedBody": 'You received ${{amount}} for "{{title}}"',
  "notifications.bookingCompletedTitle": "Work completed",
  "notifications.bookingCompletedBody": '"{{title}}" has been marked as completed.',
  "notifications.unknownListing": "this listing",
  "notifications.newMessageBody": "You have a new message",
  "messages.photo": "Photo",
  "messages.file": "File",
  "messages.voiceMessage": "Voice message",
};

function tEn(key: string, opts?: Record<string, string>) {
  let value = en[key] ?? key;
  if (opts) {
    for (const [k, v] of Object.entries(opts)) {
      value = value.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v);
    }
  }
  return value;
}

describe("displayNotificationTitle", () => {
  it("translates French payment title to English", () => {
    const notif: AppNotification = {
      id: "1",
      type: "payment",
      title: "Paiement reçu",
      body: 'Vous avez reçu 16.00 $ pour « Nettoyage de Chambre »',
      link: "/wallet",
      read_at: null,
      created_at: new Date().toISOString(),
      service_title: "Nettoyage de Chambre",
    };

    expect(displayNotificationTitle(notif, tEn)).toBe("Payment received");
  });

  it("translates French booking completed title to English", () => {
    const notif: AppNotification = {
      id: "2",
      type: "booking_completed",
      title: "Travail terminé",
      body: "« Nettoyage de Chambre » a été marqué comme terminé.",
      link: "/bookings?booking=abc",
      read_at: null,
      created_at: new Date().toISOString(),
      service_title: "Nettoyage de Chambre",
    };

    expect(displayNotificationTitle(notif, tEn)).toBe("Work completed");
  });
});

describe("displayNotificationBody", () => {
  it("translates French payment body to English", () => {
    const notif: AppNotification = {
      id: "1",
      type: "payment",
      title: "Paiement reçu",
      body: 'Vous avez reçu 16.00 $ pour « Nettoyage de Chambre »',
      link: "/wallet",
      read_at: null,
      created_at: new Date().toISOString(),
      service_title: "Nettoyage de Chambre",
    };

    expect(displayNotificationBody(notif, tEn)).toBe(
      'You received $16.00 for "Nettoyage de Chambre"',
    );
  });

  it("translates French booking completed body to English", () => {
    const notif: AppNotification = {
      id: "2",
      type: "booking_completed",
      title: "Travail terminé",
      body: "« Nettoyage de Chambre » a été marqué comme terminé.",
      link: "/bookings?booking=abc",
      read_at: null,
      created_at: new Date().toISOString(),
      service_title: "Nettoyage de Chambre",
    };

    expect(displayNotificationBody(notif, tEn)).toBe(
      '"Nettoyage de Chambre" has been marked as completed.',
    );
  });

  it("shows Photo for image file message notifications", () => {
    const notif: AppNotification = {
      id: "3",
      type: "message",
      title: "Nouveau message de Alex",
      body: "[FILE:https://cdn.example.com/chat-attachments/photo.webp]",
      link: "/messages?chat=abc",
      read_at: null,
      created_at: new Date().toISOString(),
    };

    expect(displayNotificationBody(notif, tEn)).toBe("Photo");
  });

  it("shows Voice message for audio message notifications", () => {
    const notif: AppNotification = {
      id: "4",
      type: "message",
      title: "Nouveau message de Alex",
      body: "[AUDIO:https://cdn.example.com/voice.webm:8]",
      link: "/messages?chat=abc",
      read_at: null,
      created_at: new Date().toISOString(),
    };

    expect(displayNotificationBody(notif, tEn)).toBe("Voice message");
  });
});
