import pool from "../config/db.js";
import { notifyBookingCreated, notifyBookingStatusUpdated, sendEmail } from "../services/emailService.js";
import { pushNewBooking, pushBookingStatus } from "../services/pushService.js";
import stripe from "../config/stripe.js";
import { createLocalizedNotification, shouldSendEmail } from "../services/notificationService.js";

const PROVINCE_TAX_RATES = {
  AB: 0.05, BC: 0.12, MB: 0.12, NB: 0.15, NL: 0.15, NS: 0.15,
  NT: 0.05, NU: 0.05, ON: 0.13, PE: 0.15, QC: 0.14975, SK: 0.11, YT: 0.05,
};
const PROVINCE_NAME_TO_CODE = {
  "alberta": "AB", "british columbia": "BC", "colombie-britannique": "BC",
  "manitoba": "MB", "new brunswick": "NB", "nouveau-brunswick": "NB",
  "newfoundland and labrador": "NL", "nova scotia": "NS", "northwest territories": "NT",
  "nunavut": "NU", "ontario": "ON", "prince edward island": "PE",
  "quebec": "QC", "québec": "QC", "saskatchewan": "SK", "yukon": "YT",
};
function getWorkerTaxRate(province) {
  if (!province) return PROVINCE_TAX_RATES.QC;
  const code = PROVINCE_TAX_RATES[province.toUpperCase()] !== undefined
    ? province.toUpperCase()
    : PROVINCE_NAME_TO_CODE[province.toLowerCase()];
  return PROVINCE_TAX_RATES[code] ?? PROVINCE_TAX_RATES.QC;
}

export const createBooking = async (req, res) => {
  try {
    const { errors, data } = (await import("../utils/validate.js")).validateInput(req.body, {
      service_id:         { required: true, type: "uuid" },
      client_description: { type: "string", maxLen: 2000 },
    });

    if (errors) {
      return res.status(400).json({ message: errors[0] });
    }

    const { service_id, client_description } = data;

    const service = await pool.query(
      "SELECT s.*, u.email as worker_email, u.province as owner_province, CASE WHEN u.account_type = 'company' THEN u.company_name ELSE u.full_name END as worker_name FROM services s JOIN users u ON s.user_id = u.id WHERE s.id = $1",
      [service_id]
    );

    if (service.rows.length === 0) {
      return res.status(404).json({ message: "Service not found" });
    }

    const s = service.rows[0];

    if (!s.is_active) {
      return res.status(400).json({ message: "This listing is no longer available" });
    }

    // Can't apply to your own listing
    if (s.user_id === req.user.id) {
      return res.status(400).json({ message: "You can't request your own service" });
    }

    // For "looking" listings: poster is the client (pays), requester is the worker (gets paid)
    // For "offer" listings: poster is the worker (gets paid), requester is the client (pays)
    const isLooking = s.type === "looking";
    const worker_id = isLooking ? req.user.id : s.user_id;
    const client_id = isLooking ? s.user_id : req.user.id;

    // Prevent duplicate pending requests
    const duplicate = await pool.query(
      isLooking
        ? "SELECT id FROM bookings WHERE service_id = $1 AND worker_id = $2 AND status = 'pending'"
        : "SELECT id FROM bookings WHERE service_id = $1 AND client_id = $2 AND status = 'pending'",
      [service_id, req.user.id]
    );
    if (duplicate.rows.length > 0) {
      return res.status(400).json({ message: "You already have a pending request for this listing" });
    }

    const applicant = await pool.query(
      "SELECT CASE WHEN account_type = 'company' THEN company_name ELSE full_name END AS display_name FROM users WHERE id = $1",
      [req.user.id]
    );
    const clientName = applicant.rows[0].display_name;

    // Tax rate based on the client's (buyer's) province
    const clientResult = await pool.query("SELECT province FROM users WHERE id = $1", [client_id]);
    const clientProvince = clientResult.rows[0]?.province ?? null;
    const tax_rate = getWorkerTaxRate(clientProvince);

    const result = await pool.query(
      `INSERT INTO bookings (service_id, client_id, worker_id, status, client_description, tax_rate)
       VALUES ($1, $2, $3, 'pending', $4, $5)
       RETURNING *`,
      [service_id, client_id, worker_id, client_description || null, tax_rate]
    );

    const booking = result.rows[0];

    // Ensure client has a wallet row
    await pool.query(
      "INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
      [req.user.id]
    );

    // Always notify the listing poster (s.user_id), regardless of type
    shouldSendEmail(s.user_id, "listing").then((ok) => {
      if (ok) notifyBookingCreated(s.worker_email, s.worker_name, clientName, s.title, booking.id, s.image_url)
        .catch((err) => console.error("Booking email notification failed:", err.message));
    });
    pushNewBooking(s.user_id, clientName, s.title).catch(() => {});
    createLocalizedNotification({
      userId: s.user_id,
      type: "booking_request",
      link: "/bookings",
      en: { title: "New booking request", body: `${clientName} applied to your listing "${s.title}"` },
      fr: { title: "Nouvelle demande", body: `${clientName} a postulé pour votre annonce « ${s.title} »` },
    });

    res.status(201).json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while creating booking" });
  }
};

export const getMyBookings = async (req, res) => {
  try {
    // "Envoyées" = bookings YOU initiated:
    //   offer listing  → you are the client (you booked someone's offer)
    //   looking listing → you are the worker (you applied to someone's search)
    const result = await pool.query(
      `SELECT b.*, s.title, s.price, s.image_url, s.image_urls, s.category,
              CASE
                WHEN s.hide_exact_location = true AND s.user_id <> $1
                  THEN COALESCE(NULLIF(TRIM(s.city), ''), NULLIF(TRIM(s.location), ''), NULLIF(TRIM(s.address), ''))
                ELSE COALESCE(NULLIF(TRIM(s.address), ''), NULLIF(TRIM(s.location), ''), NULLIF(TRIM(s.city), ''))
              END AS service_location,
              s.is_one_time, s.type AS service_type,
              -- worker_name = the OTHER person you're dealing with
              CASE
                WHEN s.type = 'offer' THEN CASE WHEN u.account_type = 'company' THEN u.company_name ELSE u.full_name END
                ELSE CASE WHEN w.account_type = 'company' THEN w.company_name ELSE w.full_name END
              END AS worker_name,
              EXISTS(SELECT 1 FROM reviews WHERE booking_id = b.id AND reviewer_id = $1) AS has_reviewed,
              EXISTS(SELECT 1 FROM disputes WHERE booking_id = b.id) AS has_dispute,
              b.payment_status, b.completed_by_worker, b.completed_by_client,
              b.worker_note, b.custom_price, b.last_modified_at, b.modified_fields,
              b.cancel_requested_by, b.cancel_reason, b.completed_at
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN users u ON b.worker_id = u.id
       JOIN users w ON b.client_id = w.id
       WHERE (b.client_id = $1 AND s.type = 'offer')
          OR (b.worker_id = $1 AND s.type = 'looking')
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while fetching bookings" });
  }
};

export const getReceivedBookings = async (req, res) => {
  try {
    // "Reçues" = bookings someone sent TO you:
    //   offer listing  → you are the worker (someone booked your offer)
    //   looking listing → you are the client (someone applied to your search)
    const result = await pool.query(
      `SELECT b.*, s.title, s.price, s.image_url, s.image_urls, s.category,
              CASE
                WHEN s.hide_exact_location = true AND s.user_id <> $1
                  THEN COALESCE(NULLIF(TRIM(s.city), ''), NULLIF(TRIM(s.location), ''), NULLIF(TRIM(s.address), ''))
                ELSE COALESCE(NULLIF(TRIM(s.address), ''), NULLIF(TRIM(s.location), ''), NULLIF(TRIM(s.city), ''))
              END AS service_location,
              s.is_one_time, s.type AS service_type,
              -- client_name = the OTHER person who initiated the booking
              CASE
                WHEN s.type = 'offer' THEN CASE WHEN uc.account_type = 'company' THEN uc.company_name ELSE uc.full_name END
                ELSE CASE WHEN uw.account_type = 'company' THEN uw.company_name ELSE uw.full_name END
              END AS client_name,
              EXISTS(SELECT 1 FROM reviews WHERE booking_id = b.id AND reviewer_id = $1) AS has_reviewed,
              EXISTS(SELECT 1 FROM disputes WHERE booking_id = b.id) AS has_dispute,
              b.payment_status, b.completed_by_worker, b.completed_by_client,
              b.worker_note, b.custom_price, b.last_modified_at, b.modified_fields,
              b.cancel_requested_by, b.cancel_reason, b.completed_at
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN users uc ON b.client_id = uc.id
       JOIN users uw ON b.worker_id = uw.id
       WHERE (b.worker_id = $1 AND s.type = 'offer')
          OR (b.client_id = $1 AND s.type = 'looking')
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["pending", "accepted", "active", "completed", "cancelled", "rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid booking status" });
    }

    const booking = await pool.query(
      `SELECT b.*, s.title, s.is_one_time, s.type AS service_type,
              u.email as client_email,
              CASE WHEN u.account_type = 'company' THEN u.company_name ELSE u.full_name END AS client_name,
              wu.email as worker_email,
              CASE WHEN wu.account_type = 'company' THEN wu.company_name ELSE wu.full_name END AS worker_name
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN users u ON b.client_id = u.id
       JOIN users wu ON b.worker_id = wu.id
       WHERE b.id = $1`,
      [id]
    );

    if (booking.rows.length === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const b = booking.rows[0];

    if (status === "accepted" || status === "rejected") {
      // For "offer" listings: worker (poster) accepts/rejects
      // For "looking" listings: client (poster) accepts/rejects the applicant
      const deciderIsWorker = b.service_type !== "looking";
      const deciderId = deciderIsWorker ? b.worker_id : b.client_id;
      if (deciderId !== req.user.id) {
        return res.status(403).json({ message: "Only the listing poster can accept or reject requests" });
      }
    }

    if (status === "cancelled") {
      if (b.client_id !== req.user.id && b.worker_id !== req.user.id) {
        return res.status(403).json({ message: "You are not authorized to cancel this request" });
      }
      if (!["pending", "accepted"].includes(b.status)) {
        return res.status(400).json({
          message: "In-progress or completed bookings cannot be cancelled directly. Open a dispute instead.",
        });
      }
    }

    const result = await pool.query(
      `UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (status === "accepted" || status === "rejected") {
      // Notify the party who did NOT make the decision
      const notifyId = b.service_type === "looking" ? b.worker_id : b.client_id;
      const notifyEmail = b.service_type === "looking" ? b.worker_email : b.client_email;
      const notifyName = b.service_type === "looking" ? b.worker_name : b.client_name;
      shouldSendEmail(notifyId, "listing").then((ok) => {
        if (ok) notifyBookingStatusUpdated(notifyEmail, notifyName, b.title, status, b.id)
          .catch((err) => console.error("Status email notification failed:", err.message));
      });
      pushBookingStatus(notifyId, status, b.title).catch(() => {});
      createLocalizedNotification({
        userId: notifyId,
        type: status === "accepted" ? "booking_accepted" : "booking_rejected",
        link: "/bookings",
        en: {
          title: status === "accepted" ? "Booking accepted" : "Booking rejected",
          body: status === "accepted"
            ? `Your request for "${b.title}" was accepted!`
            : `Your request for "${b.title}" was declined.`,
        },
        fr: {
          title: status === "accepted" ? "Demande acceptée" : "Demande refusée",
          body: status === "accepted"
            ? `Votre demande pour « ${b.title} » a été acceptée !`
            : `Votre demande pour « ${b.title} » a été refusée.`,
        },
      });
    }

    // One-time listing: when accepted, auto-reject all OTHER pending requests + deactivate listing
    if (status === "accepted" && b.is_one_time) {
      autoRejectOtherRequests(b.service_id, id).catch((err) =>
        console.error("Auto-reject failed for service", b.service_id, err.message)
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while updating booking" });
  }
};

// Mark completion by one party (worker or client)
export const markCompleted = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const booking = await pool.query(
      `SELECT b.*, s.title, s.price, s.is_one_time,
              CASE WHEN cw.account_type = 'company' THEN cw.company_name ELSE cw.full_name END AS worker_name,
              CASE WHEN cc.account_type = 'company' THEN cc.company_name ELSE cc.full_name END AS client_name,
              cw.id AS worker_user_id, cc.id AS client_user_id,
              cw.email AS worker_email, cc.email AS client_email,
              cc.province AS client_province
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN users cw ON b.worker_id = cw.id
       JOIN users cc ON b.client_id = cc.id
       WHERE b.id = $1`,
      [id]
    );

    if (booking.rows.length === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const b = booking.rows[0];

    if (b.status !== "active") {
      return res.status(400).json({ message: "Only active bookings can be marked as completed" });
    }

    if (b.client_id !== userId && b.worker_id !== userId) {
      return res.status(403).json({ message: "You are not part of this booking" });
    }

    const isWorker = b.worker_id === userId;
    const updateField = isWorker ? "completed_by_worker" : "completed_by_client";

    // Set this party's completion flag
    await pool.query(
      `UPDATE bookings SET ${updateField} = true WHERE id = $1`,
      [id]
    );

    // Notify the other party that this person marked the job done
    if (isWorker) {
      // Notify client: worker says job is done, waiting for client confirmation
      sendEmail(b.client_email, "jobMarkedDone", [b.client_name, b.worker_name, b.title, id]);
    } else {
      // Notify worker: client says job is done, waiting for worker confirmation
      sendEmail(b.worker_email, "jobMarkedDone", [b.worker_name, b.client_name, b.title, id]);
    }

    // Atomic UPDATE: only succeeds if BOTH flags are true AND status is still 'active'
    // This prevents double finalization if two requests arrive simultaneously
    const finalizeResult = await pool.query(
      `UPDATE bookings SET status = 'completed', completed_at = NOW()
       WHERE id = $1 AND status = 'active' AND completed_by_worker = true AND completed_by_client = true
       RETURNING *`,
      [id]
    );

    const updated = await pool.query("SELECT * FROM bookings WHERE id = $1", [id]);
    const u = updated.rows[0];

    if (finalizeResult.rowCount > 0) {
      // Only entered by the one request that actually did the UPDATE
      // Only deactivate one-time listings — recurring listings stay active
      if (b.is_one_time) {
        await pool.query(
          "UPDATE services SET is_active = false WHERE id = $1",
          [u.service_id]
        );
      }

      // Credit worker wallet automatically
      finalizeCompletion(b).catch((err) =>
        console.error("Finalize completion failed for booking", id, err.message)
      );

      // Both confirmed — send completion emails to both
      const effectivePrice = Number(b.custom_price ?? b.price);
      const taxRate = b.tax_rate ? Number(b.tax_rate) : getWorkerTaxRate(b.client_province);
      const totalPaid = (effectivePrice * (1 + 0.05 + taxRate)).toFixed(2);
      const workerReceives = (effectivePrice * 0.80).toFixed(2);
      sendEmail(b.client_email, "jobCompleted", [b.client_name, b.title, b.worker_name, totalPaid, id, "client"]);
      sendEmail(b.worker_email, "jobCompleted", [b.worker_name, b.title, b.client_name, workerReceives, id, "worker"]);

      return res.json({ ...u, status: "completed" });
    }

    res.json(u);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while marking completion" });
  }
};

// ─── Customize booking (worker edits price / note) ────────────────────────────
export const customizeBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { worker_note, custom_price } = req.body;

    const booking = await pool.query(
      `SELECT b.*, s.title,
              CASE WHEN cc.account_type = 'company' THEN cc.company_name ELSE cc.full_name END AS client_name
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN users cc ON b.client_id = cc.id
       WHERE b.id = $1`,
      [id]
    );
    if (booking.rows.length === 0) return res.status(404).json({ message: "Booking not found" });
    const b = booking.rows[0];

    if (b.worker_id !== req.user.id) return res.status(403).json({ message: "Only the provider can customize this request" });
    if (!["pending", "accepted"].includes(b.status)) return res.status(400).json({ message: "Can only customize pending or accepted requests" });
    if (custom_price !== undefined) {
      const parsed = Number(custom_price);
      if (isNaN(parsed) || parsed <= 0 || parsed > 100000) {
        return res.status(400).json({ message: "Invalid price" });
      }
    }

    // Track which fields changed
    const modifiedFields = [];
    if (custom_price !== undefined && Number(custom_price) !== Number(b.price)) modifiedFields.push("price");
    if (worker_note !== undefined && worker_note !== b.worker_note) modifiedFields.push("description");

    const result = await pool.query(
      `UPDATE bookings
       SET worker_note = $1, custom_price = $2,
           last_modified_at = NOW(), modified_fields = $3
       WHERE id = $4 RETURNING *`,
      [
        worker_note ?? b.worker_note,
        custom_price !== undefined ? Number(custom_price) : b.custom_price,
        modifiedFields.length > 0 ? modifiedFields : b.modified_fields,
        id,
      ]
    );

    // Notify client if something actually changed
    if (modifiedFields.length > 0) {
      createLocalizedNotification({
        userId: b.client_id,
        type: "booking_request",
        link: "/bookings",
        en: { title: "Request details updated", body: `The request for "${b.title}" was modified in: ${modifiedFields.join(", ")}.` },
        fr: { title: "Détails de la demande mis à jour", body: `La demande pour « ${b.title} » a été modifiée : ${modifiedFields.join(", ")}.` },
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while customizing booking" });
  }
};

// ─── Direct cancellation for active bookings is deprecated in favor of disputes ─
export const requestCancellation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const booking = await pool.query(
      `SELECT b.*, s.title FROM bookings b JOIN services s ON b.service_id = s.id WHERE b.id = $1`,
      [id]
    );
    if (booking.rows.length === 0) return res.status(404).json({ message: "Booking not found" });
    const b = booking.rows[0];

    if (b.client_id !== userId && b.worker_id !== userId) {
      return res.status(403).json({ message: "You are not part of this booking" });
    }

    if (b.status === "active") {
      return res.status(400).json({
        message: "In-progress bookings can no longer be cancelled directly. Open a dispute instead.",
      });
    }

    return res.status(400).json({ message: "Direct cancellation requests are no longer supported for this booking." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while processing cancellation" });
  }
};

// ─── Decline cancellation request ─────────────────────────────────────────────
export const declineCancellation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const booking = await pool.query("SELECT * FROM bookings WHERE id = $1", [id]);
    if (booking.rows.length === 0) return res.status(404).json({ message: "Booking not found" });
    const b = booking.rows[0];

    if (b.client_id !== userId && b.worker_id !== userId) {
      return res.status(403).json({ message: "You are not part of this booking" });
    }
    if (!b.cancel_requested_by || b.cancel_requested_by === userId) {
      return res.status(400).json({ message: "No pending cancellation to decline" });
    }

    const result = await pool.query(
      `UPDATE bookings SET cancel_requested_by = NULL, cancel_reason = NULL WHERE id = $1 RETURNING *`,
      [id]
    );
    // Notify requester that it was declined
    createLocalizedNotification({
      userId: b.cancel_requested_by,
      type: "booking_rejected",
      link: "/bookings",
      en: { title: "Cancellation declined", body: `The other party declined your cancellation request.` },
      fr: { title: "Annulation refusée", body: `L'autre partie a refusé votre demande d'annulation.` },
    });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while declining cancellation" });
  }
};

export const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT b.*, s.title, s.price, s.image_url, s.image_urls, s.category,
              CASE
                WHEN s.hide_exact_location = true AND s.user_id <> $2
                  THEN COALESCE(NULLIF(TRIM(s.city), ''), NULLIF(TRIM(s.location), ''), NULLIF(TRIM(s.address), ''))
                ELSE COALESCE(NULLIF(TRIM(s.address), ''), NULLIF(TRIM(s.location), ''), NULLIF(TRIM(s.city), ''))
              END AS service_location,
              s.is_one_time, s.type AS service_type,
              CASE WHEN uw.account_type = 'company' THEN uw.company_name ELSE uw.full_name END AS worker_name,
              CASE WHEN uc.account_type = 'company' THEN uc.company_name ELSE uc.full_name END AS client_name,
              uc.province AS client_province,
              uw.province AS worker_province,
              EXISTS(SELECT 1 FROM reviews WHERE booking_id = b.id AND reviewer_id = $2) AS has_reviewed,
              EXISTS(SELECT 1 FROM disputes WHERE booking_id = b.id) AS has_dispute,
              b.payment_status, b.completed_by_worker, b.completed_by_client,
              b.worker_note, b.custom_price, b.last_modified_at, b.modified_fields,
              b.cancel_requested_by, b.cancel_reason, b.completed_at
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN users uw ON b.worker_id = uw.id
       JOIN users uc ON b.client_id = uc.id
       WHERE b.id = $1 AND (b.client_id = $2 OR b.worker_id = $2)`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Undo mark completed (only if other party hasn't confirmed yet) ───────────
export const undoMarkCompleted = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const booking = await pool.query(
      `SELECT b.*, s.title,
              cw.email AS worker_email, CASE WHEN cw.account_type = 'company' THEN cw.company_name ELSE cw.full_name END AS worker_name,
              cc.email AS client_email, CASE WHEN cc.account_type = 'company' THEN cc.company_name ELSE cc.full_name END AS client_name
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN users cw ON b.worker_id = cw.id
       JOIN users cc ON b.client_id = cc.id
       WHERE b.id = $1`,
      [id]
    );
    if (booking.rows.length === 0) return res.status(404).json({ message: "Booking not found" });
    const b = booking.rows[0];

    if (b.status !== "active") return res.status(400).json({ message: "Booking is not active" });
    if (b.client_id !== userId && b.worker_id !== userId) return res.status(403).json({ message: "Not authorized" });

    const isWorker = b.worker_id === userId;
    const myFlag  = isWorker ? b.completed_by_worker : b.completed_by_client;
    const otherFlag = isWorker ? b.completed_by_client : b.completed_by_worker;

    if (!myFlag) return res.status(400).json({ message: "You haven't marked this done yet" });
    if (otherFlag) return res.status(400).json({ message: "The other party already confirmed — cannot undo" });

    const updateField = isWorker ? "completed_by_worker" : "completed_by_client";
    const result = await pool.query(
      `UPDATE bookings SET ${updateField} = false WHERE id = $1 RETURNING *`,
      [id]
    );

    // Notify the other party
    const markerName  = isWorker ? b.worker_name : b.client_name;
    const otherUserId = isWorker ? b.client_id   : b.worker_id;
    const otherEmail  = isWorker ? b.client_email : b.worker_email;
    const otherName   = isWorker ? b.client_name  : b.worker_name;

    createLocalizedNotification({
      userId: otherUserId,
      type: "booking_request",
      link: "/bookings",
      en: { title: "Confirmation cancelled", body: `${markerName} cancelled their completion confirmation for "${b.title}". The work is still in progress.` },
      fr: { title: "Confirmation annulée", body: `${markerName} a annulé sa confirmation de fin de travail pour « ${b.title} ». Le travail est toujours en cours.` },
    }).catch(() => {});

    sendEmail(otherEmail, "jobMarkUndone", [otherName, markerName, b.title, id])
      .catch((err) => console.error("[undoMarkCompleted] Email failed:", err.message));

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function autoRejectOtherRequests(serviceId, acceptedBookingId) {
  // Get all other pending bookings for this service
  const others = await pool.query(
    `SELECT b.id, b.client_id, b.worker_id, s.title, s.type AS service_type
     FROM bookings b
     JOIN services s ON b.service_id = s.id
     WHERE b.service_id = $1 AND b.status = 'pending' AND b.id != $2`,
    [serviceId, acceptedBookingId]
  );

  if (others.rows.length > 0) {
    await pool.query(
      "UPDATE bookings SET status = 'rejected' WHERE service_id = $1 AND status = 'pending' AND id != $2",
      [serviceId, acceptedBookingId]
    );
    // Notify each rejected applicant (worker_id for "looking", client_id for "offer")
    for (const b of others.rows) {
      const notifyId = b.service_type === "looking" ? b.worker_id : b.client_id;
      createLocalizedNotification({
        userId: notifyId,
        type: "booking_rejected",
        link: "/bookings",
        en: { title: "Request no longer available", body: `Your request for "${b.title}" was closed — the listing has been filled.` },
        fr: { title: "Demande non disponible", body: `Votre demande pour « ${b.title} » a été fermée — l'annonce est remplie.` },
      });
    }
  }

  // Deactivate the listing so it no longer appears publicly
  await pool.query(
    "UPDATE services SET is_active = false WHERE id = $1",
    [serviceId]
  );
}

async function finalizeCompletion(booking) {
  // Use custom_price if worker adjusted it, otherwise the original service price
  const effectivePrice = Number(booking.custom_price ?? booking.price);
  // Worker receives 80% (platform keeps 20% commission)
  const workerReceives = effectivePrice * 0.80;

  // Ensure worker wallet exists
  await pool.query(
    "INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
    [booking.worker_id]
  );

  // Guard both the transaction insert AND the wallet update against duplicates
  const existingCredit = await pool.query(
    "SELECT id FROM transactions WHERE booking_id = $1 AND type = 'credit'",
    [booking.id]
  );
  if (existingCredit.rows.length === 0) {
    await pool.query(
      `INSERT INTO transactions (user_id, booking_id, type, amount, description, other_user_name, listing_title)
       VALUES ($1, $2, 'credit', $3, 'Payment received for completed work', $4, $5)`,
      [booking.worker_id, booking.id, workerReceives, booking.client_name, booking.title]
    );
    // Only credit wallet if transaction didn't already exist
    await pool.query(
      `UPDATE wallets
       SET balance = balance + $1, total_earned = total_earned + $1, updated_at = NOW()
       WHERE user_id = $2`,
      [workerReceives, booking.worker_id]
    );
  }

  // Notify worker: payment received
  createLocalizedNotification({
    userId: booking.worker_id,
    type: "payment",
    link: "/wallet",
    en: { title: "Payment received", body: `You received $${workerReceives.toFixed(2)} for "${booking.title}"` },
    fr: { title: "Paiement reçu", body: `Vous avez reçu ${workerReceives.toFixed(2)} $ pour « ${booking.title} »` },
  });

  // Notify both: listing completed
  createLocalizedNotification({
    userId: booking.worker_id,
    type: "booking_completed",
    link: "/bookings",
    en: { title: "Listing completed", body: `"${booking.title}" has been marked as completed.` },
    fr: { title: "Travail terminé", body: `« ${booking.title} » a été marqué comme terminé.` },
  });
  createLocalizedNotification({
    userId: booking.client_id,
    type: "booking_completed",
    link: "/bookings",
    en: { title: "Listing completed", body: `"${booking.title}" has been marked as completed.` },
    fr: { title: "Travail terminé", body: `« ${booking.title} » a été marqué comme terminé.` },
  });
}

