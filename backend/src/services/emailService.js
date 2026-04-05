import { Resend } from "resend";

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

let _resend = null;
const getResend = () => {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
};
const FROM = process.env.FROM_EMAIL || "Uneden <noreply@uneden.ca>";
const FRONTEND = process.env.FRONTEND_URL || "https://uneden.ca";

// Templates 

const base = (content) => `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
        <!-- Header -->
        <tr>
          <td style="background:#15803d;padding:20px 32px;text-align:center;">
            <img src="https://uneden.ca/logo.png" alt="Uneden" style="height:48px;width:auto;display:inline-block;" />
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:32px;">${content}</td></tr>
        <!-- Footer -->
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

const btn = (href, label, color = "#15803d") =>
  `<a href="${href}" style="display:inline-block;background:${color};color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;margin-top:16px;">${label}</a>`;

const emailTemplates = {
  waitlistConfirmation: (lang) => ({
    subject: lang === "fr" ? "Vous êtes sur la liste Uneden !" : "You're on the Uneden waitlist!",
    html: base(lang === "fr" ? `
      <h2 style="margin:0 0 8px;color:#111827;">Vous êtes sur la liste !</h2>
      <p style="color:#374151;">Merci de votre intérêt pour <strong>Uneden</strong>.</p>
      <p style="color:#374151;">Vous serez parmi les premiers à être notifiés lors de notre lancement dans votre communauté.</p>
      <p style="color:#6b7280;font-size:13px;margin-top:24px;">Aucun spam, promis. On vous contacte seulement au lancement.</p>
    ` : `
      <h2 style="margin:0 0 8px;color:#111827;">You're on the list!</h2>
      <p style="color:#374151;">Thank you for your interest in <strong>Uneden</strong>.</p>
      <p style="color:#374151;">You'll be among the first to know when Uneden launches in your community.</p>
      <p style="color:#6b7280;font-size:13px;margin-top:24px;">No spam, ever. We'll only reach out at launch.</p>
    `),
  }),
  bookingCreated: (workerName, clientName, serviceTitle, bookingId, imageUrl) => ({
    subject: "Nouvelle réservation reçue",
    html: base(`
      <h2 style="margin:0 0 8px;color:#111827;">Nouvelle réservation !</h2>
      <p style="color:#374151;">Bonjour <strong>${esc(workerName)}</strong>,</p>
      <p style="color:#374151;"><strong>${esc(clientName)}</strong> a fait une demande pour votre service :</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;overflow:hidden;margin:20px 0;">
        ${imageUrl ? `<img src="${esc(imageUrl)}" alt="${esc(serviceTitle)}" style="width:100%;height:180px;object-fit:cover;display:block;" />` : ""}
        <div style="padding:16px;">
          <p style="margin:0;font-weight:600;color:#166534;">${esc(serviceTitle)}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">Réservation #${esc(bookingId.slice(0, 8))}</p>
        </div>
      </div>
      <p style="color:#374151;">Connectez-vous pour accepter ou refuser cette demande.</p>
      ${btn(`${FRONTEND}/bookings`, "Voir la réservation")}
    `),
  }),

  bookingStatusUpdated: (clientName, serviceTitle, status, bookingId) => ({
    subject: `Votre réservation a été ${status === "accepted" ? "acceptée " : "refusée"}`,
    html: base(`
      <h2 style="margin:0 0 8px;color:${status === "accepted" ? "#15803d" : "#dc2626"};">
        Réservation ${status === "accepted" ? "acceptée " : "refusée"}
      </h2>
      <p style="color:#374151;">Bonjour <strong>${esc(clientName)}</strong>,</p>
      <p style="color:#374151;">Votre réservation pour <strong>"${esc(serviceTitle)}"</strong> a été
        ${status === "accepted" ? "<strong style='color:#15803d'>acceptée</strong>" : "<strong style='color:#dc2626'>refusée</strong>"}.
      </p>
      ${status === "accepted" ? `<p style="color:#374151;">Vous pouvez maintenant procéder au paiement pour confirmer la prestation.</p>
      ${btn(`${FRONTEND}/bookings`, "Payer maintenant")}` :
      `${btn(`${FRONTEND}/listings`, "Trouver un autre service", "#6b7280")}`}
    `),
  }),

  newMessage: (receiverName, senderName, messagePreview, conversationId) => ({
    subject: `Nouveau message de ${esc(senderName)}`,
    html: base(`
      <h2 style="margin:0 0 8px;color:#111827;">Nouveau message</h2>
      <p style="color:#374151;">Bonjour <strong>${esc(receiverName)}</strong>,</p>
      <p style="color:#374151;"><strong>${esc(senderName)}</strong> vous a envoyé un message :</p>
      <div style="background:#f9fafb;border-left:4px solid #15803d;padding:12px 16px;margin:20px 0;border-radius:0 8px 8px 0;">
        <p style="margin:0;color:#374151;font-style:italic;">"${esc(messagePreview)}"</p>
      </div>
      ${btn(`${FRONTEND}/messages`, "Répondre")}
    `),
  }),

  unreadReminder: (receiverName, senderName, unreadCount) => ({
    subject: `Vous avez ${unreadCount > 1 ? `${unreadCount} messages non lus` : "un message non lu"} sur Uneden`,
    html: base(`
      <h2 style="margin:0 0 8px;color:#111827;">Vous avez des messages en attente</h2>
      <p style="color:#374151;">Bonjour <strong>${esc(receiverName)}</strong>,</p>
      <p style="color:#374151;">
        <strong>${esc(senderName)}</strong> vous a envoyé
        ${unreadCount > 1 ? `<strong>${unreadCount} messages</strong>` : "un message"}
        il y a plus de 24h et attend votre réponse.
      </p>
      <p style="color:#6b7280;font-size:14px;">Ne laissez pas cette opportunité passer !</p>
      ${btn(`${FRONTEND}/messages`, "Voir mes messages")}
    `),
  }),

  newReview: (targetName, reviewerName, rating, comment) => ({
    subject: `Nouvelle évaluation reçue — ${rating}/5 ⭐`,
    html: base(`
      <h2 style="margin:0 0 8px;color:#111827;">Nouvelle évaluation !</h2>
      <p style="color:#374151;">Bonjour <strong>${esc(targetName)}</strong>,</p>
      <p style="color:#374151;"><strong>${esc(reviewerName)}</strong> vous a laissé une évaluation :</p>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0;font-size:22px;">${"⭐".repeat(Math.min(5, Math.max(1, Number(rating))))}</p>
        ${comment ? `<p style="margin:10px 0 0;color:#374151;">"${esc(comment)}"</p>` : ""}
      </div>
      ${btn(`${FRONTEND}/profile/edit`, "Voir mon profil")}
    `),
  }),

  welcome: (userName) => ({
    subject: "Bienvenue sur Uneden !",
    html: base(`
      <h2 style="margin:0 0 8px;color:#111827;">Bienvenue sur Uneden, ${esc(userName)} !</h2>
      <p style="color:#374151;">Votre profil est prêt. Vous pouvez maintenant :</p>
      <ul style="color:#374151;padding-left:20px;line-height:1.8;">
        <li>Publier vos services ou chercher de l'aide</li>
        <li>Contacter d'autres membres directement</li>
        <li>Gérer vos réservations et paiements</li>
      </ul>
      ${btn(`${FRONTEND}/listings`, "Explorer les services")}
    `),
  }),

  passwordChanged: (userName) => ({
    subject: "Votre mot de passe a été modifié",
    html: base(`
      <h2 style="margin:0 0 8px;color:#111827;">Mot de passe modifié</h2>
      <p style="color:#374151;">Bonjour <strong>${esc(userName)}</strong>,</p>
      <p style="color:#374151;">Votre mot de passe Uneden a été modifié avec succès.</p>
      <p style="color:#374151;">Si vous n'êtes pas à l'origine de cette modification, contactez-nous immédiatement.</p>
      ${btn(`${FRONTEND}/profile/edit`, "Sécuriser mon compte", "#dc2626")}
    `),
  }),

  paymentReceipt: (clientName, serviceTitle, amount, workerName, bookingId, date, imageUrl) => ({
    subject: `Reçu de paiement — ${esc(serviceTitle)}`,
    html: base(`
      <h2 style="margin:0 0 8px;color:#111827;">Reçu de paiement</h2>
      <p style="color:#374151;">Bonjour <strong>${esc(clientName)}</strong>,</p>
      <p style="color:#374151;">Votre paiement a été confirmé avec succès. Voici votre reçu :</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;overflow:hidden;margin:20px 0;">
        ${imageUrl ? `<img src="${esc(imageUrl)}" alt="${esc(serviceTitle)}" style="width:100%;height:180px;object-fit:cover;display:block;" />` : ""}
      <div style="padding:20px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:#6b7280;font-size:13px;padding-bottom:8px;">Service</td>
            <td style="color:#111827;font-weight:600;text-align:right;padding-bottom:8px;">${esc(serviceTitle)}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding-bottom:8px;">Prestataire</td>
            <td style="color:#111827;text-align:right;padding-bottom:8px;">${esc(workerName)}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding-bottom:8px;">Date</td>
            <td style="color:#111827;text-align:right;padding-bottom:8px;">${esc(date)}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding-bottom:8px;">Réservation</td>
            <td style="color:#111827;text-align:right;padding-bottom:8px;">#${esc(bookingId.slice(0, 8).toUpperCase())}</td>
          </tr>
          <tr style="border-top:1px solid #bbf7d0;">
            <td style="color:#166534;font-weight:700;font-size:16px;padding-top:12px;">Total payé</td>
            <td style="color:#166534;font-weight:700;font-size:20px;text-align:right;padding-top:12px;">$${esc(String(amount))} CAD</td>
          </tr>
        </table>
      </div></div>
      <p style="color:#374151;font-size:13px;">Votre réservation est maintenant <strong style="color:#15803d;">active</strong>. Vous pouvez contacter le prestataire directement depuis la messagerie.</p>
      ${btn(`${FRONTEND}/bookings`, "Voir ma réservation")}
    `),
  }),

  jobMarkedDone: (recipientName, markerName, serviceTitle, bookingId) => ({
    subject: `${esc(markerName)} a marqué le travail comme terminé`,
    html: base(`
      <h2 style="margin:0 0 8px;color:#111827;">Travail marqué comme terminé</h2>
      <p style="color:#374151;">Bonjour <strong>${esc(recipientName)}</strong>,</p>
      <p style="color:#374151;"><strong>${esc(markerName)}</strong> a indiqué que le travail pour <strong>"${esc(serviceTitle)}"</strong> est terminé.</p>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0;color:#92400e;font-weight:600;">Action requise</p>
        <p style="margin:8px 0 0;color:#374151;font-size:14px;">Veuillez confirmer que le travail a bien été effectué en marquant également la réservation comme terminée de votre côté.</p>
      </div>
      <p style="color:#374151;font-size:13px;">Réservation #${esc(bookingId.slice(0, 8).toUpperCase())}</p>
      ${btn(`${FRONTEND}/bookings`, "Confirmer la fin du travail", "#d97706")}
    `),
  }),

  jobMarkUndone: (recipientName, markerName, serviceTitle, bookingId) => ({
    subject: `${esc(markerName)} a annulé sa confirmation de fin de travail`,
    html: base(`
      <h2 style="margin:0 0 8px;color:#111827;">Confirmation annulée</h2>
      <p style="color:#374151;">Bonjour <strong>${esc(recipientName)}</strong>,</p>
      <p style="color:#374151;"><strong>${esc(markerName)}</strong> a annulé sa confirmation de fin de travail pour <strong>"${esc(serviceTitle)}"</strong>.</p>
      <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0;color:#92400e;font-weight:600;">Travail toujours en cours</p>
        <p style="margin:8px 0 0;color:#374151;font-size:14px;">La réservation reste active. Attendez que les deux parties confirment la fin du travail avant de clôturer.</p>
      </div>
      <p style="color:#374151;font-size:13px;">Réservation #${esc(bookingId.slice(0, 8).toUpperCase())}</p>
      ${btn(`${FRONTEND}/bookings`, "Voir la réservation", "#d97706")}
    `),
  }),

  jobCompleted: (recipientName, serviceTitle, otherPartyName, amount, bookingId, role) => ({
    subject: `Réservation complétée — ${esc(serviceTitle)}`,
    html: base(`
      <h2 style="margin:0 0 8px;color:#15803d;">Réservation complétée !</h2>
      <p style="color:#374151;">Bonjour <strong>${esc(recipientName)}</strong>,</p>
      <p style="color:#374151;">Les deux parties ont confirmé la fin du travail pour <strong>"${esc(serviceTitle)}"</strong>. La réservation est maintenant clôturée.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:20px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:#6b7280;font-size:13px;padding-bottom:8px;">Service</td>
            <td style="color:#111827;font-weight:600;text-align:right;padding-bottom:8px;">${esc(serviceTitle)}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding-bottom:8px;">${role === "worker" ? "Client" : "Prestataire"}</td>
            <td style="color:#111827;text-align:right;padding-bottom:8px;">${esc(otherPartyName)}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding-bottom:8px;">Réservation</td>
            <td style="color:#111827;text-align:right;padding-bottom:8px;">#${esc(bookingId.slice(0, 8).toUpperCase())}</td>
          </tr>
          <tr style="border-top:1px solid #bbf7d0;">
            <td style="color:#166534;font-weight:700;font-size:15px;padding-top:12px;">${role === "worker" ? "À recevoir (versement)" : "Montant payé"}</td>
            <td style="color:#166534;font-weight:700;font-size:18px;text-align:right;padding-top:12px;">$${esc(String(amount))} CAD</td>
          </tr>
        </table>
      </div>
      ${role === "worker"
        ? `<p style="color:#6b7280;font-size:12px;">Le versement sera traité lors du prochain cycle bi-mensuel (délai de 5 jours ouvrables).</p>`
        : `<p style="color:#374151;font-size:13px;">Merci d'avoir utilisé Uneden !</p>`
      }
      ${btn(`${FRONTEND}/bookings`, "Voir mes réservations")}
    `),
  }),

  payoutReceived: (workerName, transferredAmount, commissionAmount, grossAmount, bookingsCount, nextPayoutDate) => ({
    subject: `Versement reçu — $${transferredAmount} CAD transféré`,
    html: base(`
      <h2 style="margin:0 0 8px;color:#15803d;">Versement traité !</h2>
      <p style="color:#374151;">Bonjour <strong>${esc(workerName)}</strong>,</p>
      <p style="color:#374151;">Votre versement bi-mensuel a été traité avec succès. Le montant a été transféré vers votre compte Stripe.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:20px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:#6b7280;font-size:13px;padding-bottom:8px;">Réservations traitées</td>
            <td style="color:#111827;font-weight:600;text-align:right;padding-bottom:8px;">${bookingsCount}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding-bottom:8px;">Montant brut</td>
            <td style="color:#111827;text-align:right;padding-bottom:8px;">$${esc(String(grossAmount))} CAD</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding-bottom:8px;">Commission plateforme (20%)</td>
            <td style="color:#dc2626;text-align:right;padding-bottom:8px;">−$${esc(String(commissionAmount))} CAD</td>
          </tr>
          <tr style="border-top:1px solid #bbf7d0;">
            <td style="color:#166534;font-weight:700;font-size:15px;padding-top:12px;">Montant transféré</td>
            <td style="color:#166534;font-weight:700;font-size:20px;text-align:right;padding-top:12px;">$${esc(String(transferredAmount))} CAD</td>
          </tr>
        </table>
      </div>
      <p style="color:#6b7280;font-size:12px;">Prochain versement prévu : <strong>${esc(nextPayoutDate)}</strong>. Les fonds arrivent sous 2–3 jours ouvrables selon votre banque.</p>
      ${btn(`${FRONTEND}/wallet`, "Voir mon portefeuille")}
    `),
  }),

  disputeCreated: (userName, bookingId, description) => ({
    subject: "Un litige a été ouvert",
    html: base(`
      <h2 style="margin:0 0 8px;color:#dc2626;">Litige ouvert</h2>
      <p style="color:#374151;">Bonjour <strong>${esc(userName)}</strong>,</p>
      <p style="color:#374151;">Un litige a été ouvert pour la réservation <strong>#${esc(bookingId.slice(0, 8))}</strong> :</p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0;color:#374151;">${esc(description)}</p>
      </div>
      <p style="color:#374151;">Notre équipe va examiner la situation. Vous serez contacté sous peu.</p>
      ${btn(`${FRONTEND}/bookings`, "Voir mes réservations", "#dc2626")}
    `),
  }),

  disputeOutcome: (userName, bookingId, status, resolution, refundedAmount) => ({
    subject: status === "resolved" ? "Décision sur votre litige" : "Votre litige a été rejeté",
    html: base(`
      <h2 style="margin:0 0 8px;color:${status === "resolved" ? "#15803d" : "#dc2626"};">
        ${status === "resolved" ? "Litige résolu" : "Litige rejeté"}
      </h2>
      <p style="color:#374151;">Bonjour <strong>${esc(userName)}</strong>,</p>
      <p style="color:#374151;">Notre équipe a rendu une décision pour la réservation <strong>#${esc(bookingId.slice(0, 8))}</strong>.</p>
      <div style="background:${status === "resolved" ? "#f0fdf4" : "#fef2f2"};border:1px solid ${status === "resolved" ? "#bbf7d0" : "#fecaca"};border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0 0 8px;font-weight:600;color:${status === "resolved" ? "#166534" : "#991b1b"};">
          ${status === "resolved" ? "Décision" : "Décision de rejet"}
        </p>
        <p style="margin:0;color:#374151;white-space:pre-line;">${esc(resolution || "Aucun détail supplémentaire fourni.")}</p>
        ${refundedAmount ? `<p style="margin:12px 0 0;color:#166534;font-weight:600;">Remboursement traité : ${esc(String(refundedAmount))} $ CAD</p>` : ""}
      </div>
      <p style="color:#374151;">Vous pouvez consulter le fil du litige dans vos réservations.</p>
      ${btn(`${FRONTEND}/bookings`, "Voir le litige", status === "resolved" ? "#15803d" : "#dc2626")}
    `),
  }),
};

// ── Core sender ────────────────────────────────────────────────────────────────

export const sendEmail = async (to, templateName, templateData) => {
  try {
    if (!to) { console.error("sendEmail: no recipient"); return false; }
    if (!process.env.RESEND_API_KEY) { console.warn("RESEND_API_KEY not set — skipping email"); return false; }

    const template = emailTemplates[templateName](...templateData);
    const { error } = await getResend().emails.send({ from: FROM, to, subject: template.subject, html: template.html });

    if (error) { console.error("Resend error:", error); return false; }
    return true;
  } catch (err) {
    console.error("sendEmail error:", err.message);
    return false;
  }
};

// ── Named helpers (same API as before — no changes needed in controllers) ──────

export const notifyBookingCreated = (workerEmail, workerName, clientName, serviceTitle, bookingId, imageUrl) =>
  sendEmail(workerEmail, "bookingCreated", [workerName, clientName, serviceTitle, bookingId, imageUrl]);

export const notifyBookingStatusUpdated = (clientEmail, clientName, serviceTitle, status, bookingId) =>
  sendEmail(clientEmail, "bookingStatusUpdated", [clientName, serviceTitle, status, bookingId]);

export const notifyNewMessage = (receiverEmail, receiverName, senderName, messagePreview, conversationId) =>
  sendEmail(receiverEmail, "newMessage", [receiverName, senderName, messagePreview, conversationId]);

export const notifyUnreadReminder = (receiverEmail, receiverName, senderName, unreadCount) =>
  sendEmail(receiverEmail, "unreadReminder", [receiverName, senderName, unreadCount]);

export const notifyNewReview = (targetEmail, targetName, reviewerName, rating, comment) =>
  sendEmail(targetEmail, "newReview", [targetName, reviewerName, rating, comment]);

export const notifyDisputeCreated = (userEmail, userName, bookingId, description) =>
  sendEmail(userEmail, "disputeCreated", [userName, bookingId, description]);

export const notifyDisputeOutcome = (userEmail, userName, bookingId, status, resolution, refundedAmount) =>
  sendEmail(userEmail, "disputeOutcome", [userName, bookingId, status, resolution, refundedAmount]);

export const notifyPaymentReceipt = (clientEmail, clientName, serviceTitle, amount, workerName, bookingId, imageUrl) =>
  sendEmail(clientEmail, "paymentReceipt", [clientName, serviceTitle, amount, workerName, bookingId, new Date().toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" }), imageUrl]);

export const notifyPayoutReceived = (workerEmail, workerName, transferredAmount, commissionAmount, grossAmount, bookingsCount, nextPayoutDate) =>
  sendEmail(workerEmail, "payoutReceived", [workerName, transferredAmount, commissionAmount, grossAmount, bookingsCount, nextPayoutDate]);

export const notifyPasswordChanged = (userEmail, userName) =>
  sendEmail(userEmail, "passwordChanged", [userName]);

export const notifyWelcome = (userEmail, userName) =>
  sendEmail(userEmail, "welcome", [userName]);

export const notifyWaitlistConfirmation = (email, lang) =>
  sendEmail(email, "waitlistConfirmation", [lang]);

export default {
  sendEmail,
  notifyBookingCreated,
  notifyBookingStatusUpdated,
  notifyNewMessage,
  notifyNewReview,
  notifyDisputeCreated,
  notifyDisputeOutcome,
  notifyPasswordChanged,
};
