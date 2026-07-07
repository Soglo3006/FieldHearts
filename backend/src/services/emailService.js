import { Resend } from "resend";
import { prepareEmailListingImage } from "../utils/emailImageUrl.js";

/** Escape user-controlled strings before placing them in HTML email templates */
function esc(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function t(lang, fr, en) {
  return lang === "en" ? en : fr;
}

function bilingualSubject(fr, en) {
  return `${fr} / ${en}`;
}

function formatEmailDate(lang, date = new Date()) {
  return date.toLocaleDateString(lang === "en" ? "en-CA" : "fr-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const BILINGUAL_DIVIDER = `
<hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />
<p style="margin:0 0 20px;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#9ca3af;">English</p>
`;

let _resend = null;
const getResend = () => {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
};
const FROM = process.env.FROM_EMAIL || "Uneden <noreply@uneden.ca>";
const FRONTEND = process.env.FRONTEND_URL || "https://uneden.ca";

function shellBilingual(frContent, enContent) {
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
        <tr>
          <td style="background:#15803d;padding:20px 32px;text-align:center;">
            <img src="https://uneden.ca/logo.png" alt="Uneden" style="height:48px;width:auto;display:inline-block;" />
          </td>
        </tr>
        <tr><td style="padding:32px;">${frContent}${BILINGUAL_DIVIDER}${enContent}</td></tr>
        <tr>
          <td style="padding:20px 32px;background:#f3f4f6;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} Uneden · <a href="${FRONTEND}" style="color:#15803d;text-decoration:none;">uneden.ca</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const btn = (href, label, color = "#15803d") =>
  `<a href="${href}" style="display:inline-block;background:${color};color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;margin-top:16px;">${label}</a>`;

function bilingualTemplate(buildForLang) {
  return (...args) => {
    const fr = buildForLang("fr", ...args);
    const en = buildForLang("en", ...args);
    return {
      subject: bilingualSubject(fr.subject, en.subject),
      html: shellBilingual(fr.body, en.body),
    };
  };
}

const emailTemplates = {
  waitlistConfirmation: bilingualTemplate((lang) => ({
    subject: t(lang, "Vous êtes sur la liste Uneden !", "You're on the Uneden waitlist!"),
    body: `
      <h2 style="margin:0 0 8px;color:#111827;">${t(lang, "Vous êtes sur la liste !", "You're on the list!")}</h2>
      <p style="color:#374151;">${t(lang, "Merci de votre intérêt pour <strong>Uneden</strong>.", "Thank you for your interest in <strong>Uneden</strong>.")}</p>
      <p style="color:#374151;">${t(
        lang,
        "Vous serez parmi les premiers à être notifiés lors de notre lancement dans votre communauté.",
        "You'll be among the first to know when Uneden launches in your community.",
      )}</p>
      <p style="color:#6b7280;font-size:13px;margin-top:24px;">${t(
        lang,
        "Aucun spam, promis. On vous contacte seulement au lancement.",
        "No spam, ever. We'll only reach out at launch.",
      )}</p>
    `,
  })),

  bookingCreated: bilingualTemplate((lang, workerName, clientName, serviceTitle, bookingId, imageUrl) => ({
    subject: t(lang, "Nouvelle réservation reçue", "New booking received"),
    body: `
      <h2 style="margin:0 0 8px;color:#111827;">${t(lang, "Nouvelle réservation !", "New booking!")}</h2>
      <p style="color:#374151;">${t(lang, "Bonjour", "Hello")} <strong>${esc(workerName)}</strong>,</p>
      <p style="color:#374151;"><strong>${esc(clientName)}</strong> ${t(
        lang,
        "a fait une demande pour votre service :",
        "requested your service:",
      )}</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;overflow:hidden;margin:20px 0;">
        ${imageUrl ? `<img src="${esc(imageUrl)}" alt="${esc(serviceTitle)}" style="width:100%;height:180px;object-fit:cover;display:block;" />` : ""}
        <div style="padding:16px;">
          <p style="margin:0;font-weight:600;color:#166534;">${esc(serviceTitle)}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">${t(lang, "Réservation", "Booking")} #${esc(bookingId.slice(0, 8))}</p>
        </div>
      </div>
      <p style="color:#374151;">${t(lang, "Connectez-vous pour accepter ou refuser cette demande.", "Sign in to accept or decline this request.")}</p>
      ${btn(`${FRONTEND}/bookings`, t(lang, "Voir la réservation", "View booking"))}
    `,
  })),

  bookingStatusUpdated: bilingualTemplate((lang, clientName, serviceTitle, status, bookingId) => ({
    subject: t(
      lang,
      `Votre réservation a été ${status === "accepted" ? "acceptée" : "refusée"}`,
      `Your booking was ${status === "accepted" ? "accepted" : "declined"}`,
    ),
    body: `
      <h2 style="margin:0 0 8px;color:${status === "accepted" ? "#15803d" : "#dc2626"};">
        ${t(lang, "Réservation", "Booking")} ${status === "accepted" ? t(lang, "acceptée", "accepted") : t(lang, "refusée", "declined")}
      </h2>
      <p style="color:#374151;">${t(lang, "Bonjour", "Hello")} <strong>${esc(clientName)}</strong>,</p>
      <p style="color:#374151;">${t(lang, "Votre réservation pour", "Your booking for")} <strong>"${esc(serviceTitle)}"</strong> ${t(lang, "a été", "was")}
        ${status === "accepted" ? `<strong style='color:#15803d'>${t(lang, "acceptée", "accepted")}</strong>` : `<strong style='color:#dc2626'>${t(lang, "refusée", "declined")}</strong>`}.
      </p>
      ${
        status === "accepted"
          ? `<p style="color:#374151;">${t(lang, "Vous pouvez maintenant procéder au paiement pour confirmer la prestation.", "You can now proceed to payment to confirm the service.")}</p>
      ${btn(`${FRONTEND}/bookings`, t(lang, "Payer maintenant", "Pay now"))}`
          : `${btn(`${FRONTEND}/listings`, t(lang, "Trouver un autre service", "Find another service"), "#6b7280")}`
      }
    `,
  })),

  newMessage: bilingualTemplate((lang, receiverName, senderName, messagePreview) => ({
    subject: t(lang, `Nouveau message de ${esc(senderName)}`, `New message from ${esc(senderName)}`),
    body: `
      <h2 style="margin:0 0 8px;color:#111827;">${t(lang, "Nouveau message", "New message")}</h2>
      <p style="color:#374151;">${t(lang, "Bonjour", "Hello")} <strong>${esc(receiverName)}</strong>,</p>
      <p style="color:#374151;"><strong>${esc(senderName)}</strong> ${t(lang, "vous a envoyé un message :", "sent you a message:")}</p>
      <div style="background:#f9fafb;border-left:4px solid #15803d;padding:12px 16px;margin:20px 0;border-radius:0 8px 8px 0;">
        <p style="margin:0;color:#374151;font-style:italic;">"${esc(messagePreview)}"</p>
      </div>
      ${btn(`${FRONTEND}/messages`, t(lang, "Répondre", "Reply"))}
    `,
  })),

  unreadReminder: bilingualTemplate((lang, receiverName, senderName, unreadCount) => ({
    subject: t(
      lang,
      `Vous avez ${unreadCount > 1 ? `${unreadCount} messages non lus` : "un message non lu"} sur Uneden`,
      `You have ${unreadCount > 1 ? `${unreadCount} unread messages` : "an unread message"} on Uneden`,
    ),
    body: `
      <h2 style="margin:0 0 8px;color:#111827;">${t(lang, "Vous avez des messages en attente", "You have messages waiting")}</h2>
      <p style="color:#374151;">${t(lang, "Bonjour", "Hello")} <strong>${esc(receiverName)}</strong>,</p>
      <p style="color:#374151;">
        <strong>${esc(senderName)}</strong> ${t(lang, "vous a envoyé", "sent you")}
        ${unreadCount > 1 ? `<strong>${unreadCount} ${t(lang, "messages", "messages")}</strong>` : t(lang, "un message", "a message")}
        ${t(lang, "il y a plus de 24h et attend votre réponse.", "more than 24 hours ago and is waiting for your reply.")}
      </p>
      <p style="color:#6b7280;font-size:14px;">${t(lang, "Ne laissez pas cette opportunité passer !", "Don't miss this opportunity!")}</p>
      ${btn(`${FRONTEND}/messages`, t(lang, "Voir mes messages", "View my messages"))}
    `,
  })),

  newReview: bilingualTemplate((lang, targetName, reviewerName, rating, comment) => ({
    subject: t(lang, `Nouvelle évaluation reçue — ${rating}/5 ⭐`, `New review received — ${rating}/5 ⭐`),
    body: `
      <h2 style="margin:0 0 8px;color:#111827;">${t(lang, "Nouvelle évaluation !", "New review!")}</h2>
      <p style="color:#374151;">${t(lang, "Bonjour", "Hello")} <strong>${esc(targetName)}</strong>,</p>
      <p style="color:#374151;"><strong>${esc(reviewerName)}</strong> ${t(lang, "vous a laissé une évaluation :", "left you a review:")}</p>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0;font-size:22px;">${"⭐".repeat(Math.min(5, Math.max(1, Number(rating))))}</p>
        ${comment ? `<p style="margin:10px 0 0;color:#374151;">"${esc(comment)}"</p>` : ""}
      </div>
      ${btn(`${FRONTEND}/profile/edit`, t(lang, "Voir mon profil", "View my profile"))}
    `,
  })),

  welcome: bilingualTemplate((lang, userName) => ({
    subject: t(lang, "Bienvenue sur Uneden !", "Welcome to Uneden!"),
    body: `
      <h2 style="margin:0 0 8px;color:#111827;">${t(lang, `Bienvenue sur Uneden, ${esc(userName)} !`, `Welcome to Uneden, ${esc(userName)}!`)}</h2>
      <p style="color:#374151;">${t(lang, "Votre profil est prêt. Vous pouvez maintenant :", "Your profile is ready. You can now:")}</p>
      <ul style="color:#374151;padding-left:20px;line-height:1.8;">
        <li>${t(lang, "Publier vos services ou chercher de l'aide", "Post your services or find help")}</li>
        <li>${t(lang, "Contacter d'autres membres directement", "Contact other members directly")}</li>
        <li>${t(lang, "Gérer vos réservations et paiements", "Manage your bookings and payments")}</li>
      </ul>
      ${btn(`${FRONTEND}/listings`, t(lang, "Explorer les services", "Browse services"))}
    `,
  })),

  passwordChanged: bilingualTemplate((lang, userName) => ({
    subject: t(lang, "Votre mot de passe a été modifié", "Your password was changed"),
    body: `
      <h2 style="margin:0 0 8px;color:#111827;">${t(lang, "Mot de passe modifié", "Password changed")}</h2>
      <p style="color:#374151;">${t(lang, "Bonjour", "Hello")} <strong>${esc(userName)}</strong>,</p>
      <p style="color:#374151;">${t(lang, "Votre mot de passe Uneden a été modifié avec succès.", "Your Uneden password was changed successfully.")}</p>
      <p style="color:#374151;">${t(lang, "Si vous n'êtes pas à l'origine de cette modification, contactez-nous immédiatement.", "If you did not make this change, contact us immediately.")}</p>
      ${btn(`${FRONTEND}/profile/edit`, t(lang, "Sécuriser mon compte", "Secure my account"), "#dc2626")}
    `,
  })),

  paymentReceipt: bilingualTemplate((lang, clientName, serviceTitle, amount, workerName, bookingId, imageUrl) => ({
    subject: t(lang, `Reçu de paiement — ${esc(serviceTitle)}`, `Payment receipt — ${esc(serviceTitle)}`),
    body: `
      <h2 style="margin:0 0 8px;color:#111827;">${t(lang, "Reçu de paiement", "Payment receipt")}</h2>
      <p style="color:#374151;">${t(lang, "Bonjour", "Hello")} <strong>${esc(clientName)}</strong>,</p>
      <p style="color:#374151;">${t(lang, "Votre paiement a été confirmé avec succès. Voici votre reçu :", "Your payment was confirmed successfully. Here is your receipt:")}</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;overflow:hidden;margin:20px 0;">
        ${imageUrl ? `<img src="${esc(imageUrl)}" alt="${esc(serviceTitle)}" style="width:100%;height:180px;object-fit:cover;display:block;" />` : ""}
      <div style="padding:20px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:#6b7280;font-size:13px;padding-bottom:8px;">${t(lang, "Service", "Service")}</td>
            <td style="color:#111827;font-weight:600;text-align:right;padding-bottom:8px;">${esc(serviceTitle)}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding-bottom:8px;">${t(lang, "Prestataire", "Provider")}</td>
            <td style="color:#111827;text-align:right;padding-bottom:8px;">${esc(workerName)}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding-bottom:8px;">${t(lang, "Date", "Date")}</td>
            <td style="color:#111827;text-align:right;padding-bottom:8px;">${esc(formatEmailDate(lang))}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding-bottom:8px;">${t(lang, "Réservation", "Booking")}</td>
            <td style="color:#111827;text-align:right;padding-bottom:8px;">#${esc(bookingId.slice(0, 8).toUpperCase())}</td>
          </tr>
          <tr style="border-top:1px solid #bbf7d0;">
            <td style="color:#166534;font-weight:700;font-size:16px;padding-top:12px;">${t(lang, "Total payé", "Total paid")}</td>
            <td style="color:#166534;font-weight:700;font-size:20px;text-align:right;padding-top:12px;">$${esc(String(amount))} CAD</td>
          </tr>
        </table>
      </div></div>
      <p style="color:#374151;font-size:13px;">${t(lang, "Votre réservation est maintenant", "Your booking is now")} <strong style="color:#15803d;">${t(lang, "active", "active")}</strong>. ${t(lang, "Vous pouvez contacter le prestataire directement depuis la messagerie.", "You can contact the provider directly from messaging.")}</p>
      ${btn(`${FRONTEND}/bookings`, t(lang, "Voir ma réservation", "View my booking"))}
    `,
  })),

  jobMarkedDone: bilingualTemplate((lang, recipientName, markerName, serviceTitle, bookingId) => ({
    subject: t(
      lang,
      `${esc(markerName)} a marqué le travail comme terminé`,
      `${esc(markerName)} marked the work as completed`,
    ),
    body: `
      <h2 style="margin:0 0 8px;color:#111827;">${t(lang, "Travail marqué comme terminé", "Work marked as completed")}</h2>
      <p style="color:#374151;">${t(lang, "Bonjour", "Hello")} <strong>${esc(recipientName)}</strong>,</p>
      <p style="color:#374151;"><strong>${esc(markerName)}</strong> ${t(lang, "a indiqué que le travail pour", "indicated that the work for")} <strong>"${esc(serviceTitle)}"</strong> ${t(lang, "est terminé.", "is complete.")}</p>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0;color:#92400e;font-weight:600;">${t(lang, "Action requise", "Action required")}</p>
        <p style="margin:8px 0 0;color:#374151;font-size:14px;">${t(lang, "Veuillez confirmer que le travail a bien été effectué en marquant également la réservation comme terminée de votre côté.", "Please confirm the work was completed by marking the booking as complete on your side as well.")}</p>
      </div>
      <p style="color:#374151;font-size:13px;">${t(lang, "Réservation", "Booking")} #${esc(bookingId.slice(0, 8).toUpperCase())}</p>
      ${btn(`${FRONTEND}/bookings`, t(lang, "Confirmer la fin du travail", "Confirm work completion"), "#d97706")}
    `,
  })),

  jobMarkUndone: bilingualTemplate((lang, recipientName, markerName, serviceTitle, bookingId) => ({
    subject: t(
      lang,
      `${esc(markerName)} a annulé sa confirmation de fin de travail`,
      `${esc(markerName)} cancelled their work completion confirmation`,
    ),
    body: `
      <h2 style="margin:0 0 8px;color:#111827;">${t(lang, "Confirmation annulée", "Confirmation cancelled")}</h2>
      <p style="color:#374151;">${t(lang, "Bonjour", "Hello")} <strong>${esc(recipientName)}</strong>,</p>
      <p style="color:#374151;"><strong>${esc(markerName)}</strong> ${t(lang, "a annulé sa confirmation de fin de travail pour", "cancelled their work completion confirmation for")} <strong>"${esc(serviceTitle)}"</strong>.</p>
      <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0;color:#92400e;font-weight:600;">${t(lang, "Travail toujours en cours", "Work still in progress")}</p>
        <p style="margin:8px 0 0;color:#374151;font-size:14px;">${t(lang, "La réservation reste active. Attendez que les deux parties confirment la fin du travail avant de clôturer.", "The booking remains active. Both parties must confirm work completion before closing.")}</p>
      </div>
      <p style="color:#374151;font-size:13px;">${t(lang, "Réservation", "Booking")} #${esc(bookingId.slice(0, 8).toUpperCase())}</p>
      ${btn(`${FRONTEND}/bookings`, t(lang, "Voir la réservation", "View booking"), "#d97706")}
    `,
  })),

  jobCompleted: bilingualTemplate((lang, recipientName, serviceTitle, otherPartyName, amount, bookingId, role) => ({
    subject: t(lang, `Réservation complétée — ${esc(serviceTitle)}`, `Booking completed — ${esc(serviceTitle)}`),
    body: `
      <h2 style="margin:0 0 8px;color:#15803d;">${t(lang, "Réservation complétée !", "Booking completed!")}</h2>
      <p style="color:#374151;">${t(lang, "Bonjour", "Hello")} <strong>${esc(recipientName)}</strong>,</p>
      <p style="color:#374151;">${t(lang, "Les deux parties ont confirmé la fin du travail pour", "Both parties confirmed work completion for")} <strong>"${esc(serviceTitle)}"</strong>. ${t(lang, "La réservation est maintenant clôturée.", "The booking is now closed.")}</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:20px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:#6b7280;font-size:13px;padding-bottom:8px;">${t(lang, "Service", "Service")}</td>
            <td style="color:#111827;font-weight:600;text-align:right;padding-bottom:8px;">${esc(serviceTitle)}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding-bottom:8px;">${role === "worker" ? t(lang, "Client", "Client") : t(lang, "Prestataire", "Provider")}</td>
            <td style="color:#111827;text-align:right;padding-bottom:8px;">${esc(otherPartyName)}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding-bottom:8px;">${t(lang, "Réservation", "Booking")}</td>
            <td style="color:#111827;text-align:right;padding-bottom:8px;">#${esc(bookingId.slice(0, 8).toUpperCase())}</td>
          </tr>
          <tr style="border-top:1px solid #bbf7d0;">
            <td style="color:#166534;font-weight:700;font-size:15px;padding-top:12px;">${role === "worker" ? t(lang, "À recevoir (versement)", "To receive (payout)") : t(lang, "Montant payé", "Amount paid")}</td>
            <td style="color:#166534;font-weight:700;font-size:18px;text-align:right;padding-top:12px;">$${esc(String(amount))} CAD</td>
          </tr>
        </table>
      </div>
      ${
        role === "worker"
          ? `<p style="color:#6b7280;font-size:12px;">${t(lang, "Le versement sera traité lors du prochain cycle bi-mensuel (délai de 5 jours ouvrables).", "Payout will be processed on the next bi-weekly cycle (5 business days).")}</p>`
          : `<p style="color:#374151;font-size:13px;">${t(lang, "Merci d'avoir utilisé Uneden !", "Thank you for using Uneden!")}</p>`
      }
      ${btn(`${FRONTEND}/bookings`, t(lang, "Voir mes réservations", "View my bookings"))}
    `,
  })),

  payoutReceived: bilingualTemplate((lang, workerName, transferredAmount, commissionAmount, grossAmount, bookingsCount, nextPayoutDate) => ({
    subject: t(lang, `Versement reçu — $${transferredAmount} CAD transféré`, `Payout received — $${transferredAmount} CAD transferred`),
    body: `
      <h2 style="margin:0 0 8px;color:#15803d;">${t(lang, "Versement traité !", "Payout processed!")}</h2>
      <p style="color:#374151;">${t(lang, "Bonjour", "Hello")} <strong>${esc(workerName)}</strong>,</p>
      <p style="color:#374151;">${t(lang, "Votre versement bi-mensuel a été traité avec succès. Le montant a été transféré vers votre compte Stripe.", "Your bi-weekly payout was processed successfully. The amount was transferred to your Stripe account.")}</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:20px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:#6b7280;font-size:13px;padding-bottom:8px;">${t(lang, "Réservations traitées", "Bookings processed")}</td>
            <td style="color:#111827;font-weight:600;text-align:right;padding-bottom:8px;">${bookingsCount}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding-bottom:8px;">${t(lang, "Montant brut", "Gross amount")}</td>
            <td style="color:#111827;text-align:right;padding-bottom:8px;">$${esc(String(grossAmount))} CAD</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding-bottom:8px;">${t(lang, "Commission plateforme (5%)", "Platform commission (5%)")}</td>
            <td style="color:#dc2626;text-align:right;padding-bottom:8px;">−$${esc(String(commissionAmount))} CAD</td>
          </tr>
          <tr style="border-top:1px solid #bbf7d0;">
            <td style="color:#166534;font-weight:700;font-size:15px;padding-top:12px;">${t(lang, "Montant transféré", "Amount transferred")}</td>
            <td style="color:#166534;font-weight:700;font-size:20px;text-align:right;padding-top:12px;">$${esc(String(transferredAmount))} CAD</td>
          </tr>
        </table>
      </div>
      <p style="color:#6b7280;font-size:12px;">${t(lang, "Prochain versement prévu :", "Next payout expected:")} <strong>${esc(nextPayoutDate)}</strong>. ${t(lang, "Les fonds arrivent sous 2–3 jours ouvrables selon votre banque.", "Funds arrive within 2–3 business days depending on your bank.")}</p>
      ${btn(`${FRONTEND}/wallet`, t(lang, "Voir mon portefeuille", "View my wallet"))}
    `,
  })),

  disputeCreated: bilingualTemplate((lang, userName, bookingId, description) => ({
    subject: t(lang, "Un litige a été ouvert", "A dispute was opened"),
    body: `
      <h2 style="margin:0 0 8px;color:#dc2626;">${t(lang, "Litige ouvert", "Dispute opened")}</h2>
      <p style="color:#374151;">${t(lang, "Bonjour", "Hello")} <strong>${esc(userName)}</strong>,</p>
      <p style="color:#374151;">${t(lang, "Un litige a été ouvert pour la réservation", "A dispute was opened for booking")} <strong>#${esc(bookingId.slice(0, 8))}</strong> :</p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0;color:#374151;">${esc(description)}</p>
      </div>
      <p style="color:#374151;">${t(lang, "Notre équipe va examiner la situation. Vous serez contacté sous peu.", "Our team will review the situation. You will be contacted shortly.")}</p>
      ${btn(`${FRONTEND}/bookings`, t(lang, "Voir mes réservations", "View my bookings"), "#dc2626")}
    `,
  })),

  adminEmailOtp: bilingualTemplate((lang, code) => ({
    subject: t(lang, "Code de connexion — Admin Uneden", "Sign-in code — Uneden Admin"),
    body: `
      <h2 style="margin:0 0 8px;color:#111827;">${t(lang, "Vérification de votre connexion", "Verify your sign-in")}</h2>
      <p style="color:#374151;">${t(lang, "Une connexion à l'administration Uneden a été demandée avec votre compte. Si c'est bien vous, entrez ce code sur la page d'administration :", "A sign-in to Uneden administration was requested with your account. If this was you, enter this code on the admin page:")}</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px;margin:24px 0;text-align:center;">
        <p style="margin:0;font-size:32px;font-weight:700;letter-spacing:8px;color:#166534;font-family:monospace;">${esc(code)}</p>
      </div>
      <p style="color:#6b7280;font-size:13px;">${t(lang, "Ce code expire dans 10 minutes. Si vous n'avez pas demandé cette connexion, changez votre mot de passe et contactez le support.", "This code expires in 10 minutes. If you did not request this sign-in, change your password and contact support.")}</p>
    `,
  })),

  disputeOutcome: bilingualTemplate((lang, userName, bookingId, status, resolution, refundedAmount) => ({
    subject: t(
      lang,
      status === "resolved" ? "Décision sur votre litige" : "Votre litige a été rejeté",
      status === "resolved" ? "Decision on your dispute" : "Your dispute was rejected",
    ),
    body: `
      <h2 style="margin:0 0 8px;color:${status === "resolved" ? "#15803d" : "#dc2626"};">
        ${status === "resolved" ? t(lang, "Litige résolu", "Dispute resolved") : t(lang, "Litige rejeté", "Dispute rejected")}
      </h2>
      <p style="color:#374151;">${t(lang, "Bonjour", "Hello")} <strong>${esc(userName)}</strong>,</p>
      <p style="color:#374151;">${t(lang, "Notre équipe a rendu une décision pour la réservation", "Our team made a decision for booking")} <strong>#${esc(bookingId.slice(0, 8))}</strong>.</p>
      <div style="background:${status === "resolved" ? "#f0fdf4" : "#fef2f2"};border:1px solid ${status === "resolved" ? "#bbf7d0" : "#fecaca"};border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0 0 8px;font-weight:600;color:${status === "resolved" ? "#166534" : "#991b1b"};">
          ${status === "resolved" ? t(lang, "Décision", "Decision") : t(lang, "Décision de rejet", "Rejection decision")}
        </p>
        <p style="margin:0;color:#374151;white-space:pre-line;">${esc(resolution || t(lang, "Aucun détail supplémentaire fourni.", "No additional details provided."))}</p>
        ${refundedAmount ? `<p style="margin:12px 0 0;color:#166534;font-weight:600;">${t(lang, "Remboursement traité :", "Refund processed:")} ${esc(String(refundedAmount))} $ CAD</p>` : ""}
      </div>
      <p style="color:#374151;">${t(lang, "Vous pouvez consulter le fil du litige dans vos réservations.", "You can view the dispute thread in your bookings.")}</p>
      ${btn(`${FRONTEND}/bookings`, t(lang, "Voir le litige", "View dispute"), status === "resolved" ? "#15803d" : "#dc2626")}
    `,
  })),
};

export const sendEmail = async (to, templateName, templateData, _lang = "fr", options = {}) => {
  try {
    if (!to) { console.error("sendEmail: no recipient"); return false; }
    if (!process.env.RESEND_API_KEY) { console.warn("RESEND_API_KEY not set — skipping email"); return false; }

    const template = emailTemplates[templateName](...templateData);
    const payload = {
      from: FROM,
      to,
      subject: template.subject,
      html: template.html,
    };
    if (options.attachments?.length) {
      payload.attachments = options.attachments;
    }

    const { error } = await getResend().emails.send(payload);

    if (error) { console.error("Resend error:", error); return false; }
    return true;
  } catch (err) {
    console.error("sendEmail error:", err.message);
    return false;
  }
};

export const notifyBookingCreated = (workerEmail, workerName, clientName, serviceTitle, bookingId, imageUrl, imageUrls, _lang = "fr") => {
  const { src, attachments } = prepareEmailListingImage(imageUrl, imageUrls);
  return sendEmail(workerEmail, "bookingCreated", [workerName, clientName, serviceTitle, bookingId, src], "fr", { attachments });
};

export const notifyBookingStatusUpdated = (clientEmail, clientName, serviceTitle, status, bookingId, _lang = "fr") =>
  sendEmail(clientEmail, "bookingStatusUpdated", [clientName, serviceTitle, status, bookingId]);

export const notifyNewMessage = (receiverEmail, receiverName, senderName, messagePreview, conversationId, _lang = "fr") =>
  sendEmail(receiverEmail, "newMessage", [receiverName, senderName, messagePreview, conversationId]);

export const notifyUnreadReminder = (receiverEmail, receiverName, senderName, unreadCount, _lang = "fr") =>
  sendEmail(receiverEmail, "unreadReminder", [receiverName, senderName, unreadCount]);

export const notifyNewReview = (targetEmail, targetName, reviewerName, rating, comment, _lang = "fr") =>
  sendEmail(targetEmail, "newReview", [targetName, reviewerName, rating, comment]);

export const notifyDisputeCreated = (userEmail, userName, bookingId, description, _lang = "fr") =>
  sendEmail(userEmail, "disputeCreated", [userName, bookingId, description]);

export const notifyDisputeOutcome = (userEmail, userName, bookingId, status, resolution, refundedAmount, _lang = "fr") =>
  sendEmail(userEmail, "disputeOutcome", [userName, bookingId, status, resolution, refundedAmount]);

export const notifyPaymentReceipt = (clientEmail, clientName, serviceTitle, amount, workerName, bookingId, imageUrl, imageUrls, _lang = "fr") => {
  const { src, attachments } = prepareEmailListingImage(imageUrl, imageUrls);
  return sendEmail(
    clientEmail,
    "paymentReceipt",
    [clientName, serviceTitle, amount, workerName, bookingId, src],
    "fr",
    { attachments },
  );
};

export const notifyPayoutReceived = (workerEmail, workerName, transferredAmount, commissionAmount, grossAmount, bookingsCount, nextPayoutDate, _lang = "fr") =>
  sendEmail(workerEmail, "payoutReceived", [workerName, transferredAmount, commissionAmount, grossAmount, bookingsCount, nextPayoutDate]);

export const notifyPasswordChanged = (userEmail, userName, _lang = "fr") =>
  sendEmail(userEmail, "passwordChanged", [userName]);

export const notifyWelcome = (userEmail, userName, _lang = "fr") =>
  sendEmail(userEmail, "welcome", [userName]);

export const notifyWaitlistConfirmation = (email, _lang = "fr") =>
  sendEmail(email, "waitlistConfirmation", []);

export const notifyAdminEmailOtp = (email, code, _lang = "fr") =>
  sendEmail(email, "adminEmailOtp", [code]);

export default {
  sendEmail,
  notifyBookingCreated,
  notifyBookingStatusUpdated,
  notifyNewMessage,
  notifyUnreadReminder,
  notifyNewReview,
  notifyDisputeCreated,
  notifyDisputeOutcome,
  notifyPaymentReceipt,
  notifyPayoutReceived,
  notifyPasswordChanged,
  notifyWelcome,
  notifyWaitlistConfirmation,
  notifyAdminEmailOtp,
};
