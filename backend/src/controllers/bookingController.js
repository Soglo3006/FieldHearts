import pool from "../config/db.js";
import { notifyBookingCreated, notifyBookingStatusUpdated, sendEmail } from "../services/emailService.js";
import { pushNewBooking, pushBookingStatus } from "../services/pushService.js";
import stripe from "../config/stripe.js";
import { createNotification, shouldSendEmail } from "../services/notificationService.js";

export const createBooking = async (req, res) => {
  try {
    const { service_id, client_description } = req.body;

    const service = await pool.query(
      "SELECT s.*, u.email as worker_email, CASE WHEN u.account_type = 'company' THEN u.company_name ELSE u.full_name END as worker_name FROM services s JOIN users u ON s.user_id = u.id WHERE s.id = $1",
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

    const result = await pool.query(
      `INSERT INTO bookings (service_id, client_id, worker_id, status, client_description)
       VALUES ($1, $2, $3, 'pending', $4)
       RETURNING *`,
      [service_id, client_id, worker_id, client_description || null]
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
    createNotification({
      userId: s.user_id,
      type: "booking_request",
      title: "New booking request",
      body: `${clientName} applied to your listing "${s.title}"`,
      link: "/bookings",
    });

    res.status(201).json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while creating booking" });
  }
};

export const getMyBookings = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, s.title, s.price, s.image_url, s.category, s.location AS service_location,
              s.is_one_time, s.type AS service_type,
              CASE WHEN u.account_type = 'company' THEN u.company_name ELSE u.full_name END AS worker_name,
              CASE WHEN w.account_type = 'company' THEN w.company_name ELSE w.full_name END AS client_name,
              EXISTS(SELECT 1 FROM reviews WHERE booking_id = b.id AND reviewer_id = $1) AS has_reviewed,
              EXISTS(SELECT 1 FROM disputes WHERE booking_id = b.id) AS has_dispute,
              b.payment_status, b.completed_by_worker, b.completed_by_client,
              b.worker_note, b.custom_price, b.last_modified_at, b.modified_fields,
              b.cancel_requested_by, b.cancel_reason
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN users u ON b.worker_id = u.id
       JOIN users w ON b.client_id = w.id
       WHERE b.client_id = $1
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
    const result = await pool.query(
      `SELECT b.*, s.title, s.price, s.image_url, s.category, s.location AS service_location,
              s.is_one_time, s.type AS service_type,
              CASE WHEN u.account_type = 'company' THEN u.company_name ELSE u.full_name END AS client_name,
              EXISTS(SELECT 1 FROM reviews WHERE booking_id = b.id AND reviewer_id = $1) AS has_reviewed,
              EXISTS(SELECT 1 FROM disputes WHERE booking_id = b.id) AS has_dispute,
              b.payment_status, b.completed_by_worker, b.completed_by_client,
              b.worker_note, b.custom_price, b.last_modified_at, b.modified_fields,
              b.cancel_requested_by, b.cancel_reason
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN users u ON b.client_id = u.id
       WHERE b.worker_id = $1
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
      createNotification({
        userId: notifyId,
        type: status === "accepted" ? "booking_accepted" : "booking_rejected",
        title: status === "accepted" ? "Booking accepted" : "Booking rejected",
        body: status === "accepted"
          ? `Your request for "${b.title}" was accepted!`
          : `Your request for "${b.title}" was declined.`,
        link: "/bookings",
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
      `SELECT b.*, s.title, s.price,
              CASE WHEN cw.account_type = 'company' THEN cw.company_name ELSE cw.full_name END AS worker_name,
              CASE WHEN cc.account_type = 'company' THEN cc.company_name ELSE cc.full_name END AS client_name,
              cw.id AS worker_user_id, cc.id AS client_user_id,
              cw.email AS worker_email, cc.email AS client_email
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

    // Re-fetch to check if BOTH have now completed
    const updated = await pool.query(
      "SELECT * FROM bookings WHERE id = $1",
      [id]
    );
    const u = updated.rows[0];

    if (u.completed_by_worker && u.completed_by_client) {
      // Both confirmed — finalize
      await pool.query(
        "UPDATE bookings SET status = 'completed' WHERE id = $1",
        [id]
      );
      // Hide the listing from public search now that the job is done
      await pool.query(
        "UPDATE services SET is_active = false WHERE id = $1",
        [u.service_id]
      );

      // Credit worker wallet automatically
      finalizeCompletion(b).catch((err) =>
        console.error("Finalize completion failed for booking", id, err.message)
      );

      // Both confirmed — send completion emails to both
      const totalPaid = (Number(b.price) * 1.22975).toFixed(2);
      const workerReceives = (Number(b.price) * 0.80).toFixed(2);
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
      createNotification({
        userId: b.client_id,
        type: "booking_request",
        title: "Request details updated",
        body: `The request for "${b.title}" was modified in: ${modifiedFields.join(", ")}.`,
        link: "/bookings",
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while customizing booking" });
  }
};

// ─── Request cancellation (mutual for active bookings) ────────────────────────
export const requestCancellation = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
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

    if (b.status !== "active") {
      return res.status(400).json({ message: "Only active bookings require mutual cancellation" });
    }

    // If no cancellation requested yet, record the request
    if (!b.cancel_requested_by) {
      const result = await pool.query(
        `UPDATE bookings SET cancel_requested_by = $1, cancel_reason = $2 WHERE id = $3 RETURNING *`,
        [userId, reason || null, id]
      );
      // Notify the other party
      const otherUserId = userId === b.worker_id ? b.client_id : b.worker_id;
      createNotification({
        userId: otherUserId,
        type: "booking_request",
        title: "Cancellation requested",
        body: `The other party wants to cancel "${b.title}". Review and approve or decline.`,
        link: "/bookings",
      });
      return res.json(result.rows[0]);
    }

    // The OTHER party is now approving the cancellation
    if (b.cancel_requested_by === userId) {
      return res.status(400).json({ message: "You already requested cancellation — waiting for the other party" });
    }

    // Both agreed — cancel the booking
    const result = await pool.query(
      `UPDATE bookings SET status = 'cancelled', cancel_requested_by = NULL WHERE id = $1 RETURNING *`,
      [id]
    );
    // Notify requester that it's approved
    createNotification({
      userId: b.cancel_requested_by,
      type: "booking_rejected",
      title: "Cancellation approved",
      body: `The cancellation of "${b.title}" has been approved.`,
      link: "/bookings",
    });
    res.json(result.rows[0]);
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
    createNotification({
      userId: b.cancel_requested_by,
      type: "booking_rejected",
      title: "Cancellation declined",
      body: `The other party declined your cancellation request.`,
      link: "/bookings",
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
      `SELECT b.*, s.title, s.price, s.image_url, s.location, s.city,
              CASE WHEN u.account_type = 'company' THEN u.company_name ELSE u.full_name END AS worker_name
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN users u ON b.worker_id = u.id
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
      createNotification({
        userId: notifyId,
        type: "booking_rejected",
        title: "Request no longer available",
        body: `Your request for "${b.title}" was closed — the listing has been filled.`,
        link: "/bookings",
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
  // Worker receives the service price; the $5 platform fee was already added on top at checkout
  const workerReceives = Number(booking.price);

  // Ensure worker wallet exists
  await pool.query(
    "INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
    [booking.worker_id]
  );

  // Credit worker wallet (client debit was already recorded at payment time)
  await pool.query(
    `UPDATE wallets
     SET balance = balance + $1, total_earned = total_earned + $1, updated_at = NOW()
     WHERE user_id = $2`,
    [workerReceives, booking.worker_id]
  );

  // Record worker's credit transaction
  await pool.query(
    `INSERT INTO transactions (user_id, booking_id, type, amount, description, other_user_name, listing_title)
     VALUES ($1, $2, 'credit', $3, 'Paiement reçu pour travail complété', $4, $5)
     ON CONFLICT DO NOTHING`,
    [booking.worker_id, booking.id, workerReceives, booking.client_name, booking.title]
  );

  // Notify worker: payment received
  createNotification({
    userId: booking.worker_id,
    type: "payment",
    title: "Payment received",
    body: `You received $${workerReceives.toFixed(2)} for "${booking.title}"`,
    link: "/wallet",
  });

  // Notify both: listing completed
  createNotification({
    userId: booking.worker_id,
    type: "booking_completed",
    title: "Listing completed",
    body: `"${booking.title}" has been marked as completed.`,
    link: "/bookings",
  });
  createNotification({
    userId: booking.client_id,
    type: "booking_completed",
    title: "Listing completed",
    body: `"${booking.title}" has been marked as completed.`,
    link: "/bookings",
  });
}

