import pool from "../config/db.js";
import { validateInput, sanitizeText } from "../utils/validate.js";
import { ensureDepositsAndCalendarSchema } from "../utils/depositSchema.js";
import { createLocalizedNotification } from "../services/notificationService.js";
import { refreshHourlyBalanceDue } from "../services/hourlyBalanceService.js";

const AUTO_APPROVE_MS = 72 * 60 * 60 * 1000;

async function assertBookingParticipant(bookingId, userId) {
  const result = await pool.query(
    `SELECT b.*, s.title AS service_title, s.pricing_mode
     FROM bookings b
     JOIN services s ON s.id = b.service_id
     WHERE b.id = $1`,
    [bookingId],
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  if (row.client_id !== userId && row.worker_id !== userId) return null;
  return row;
}

function roleFor(booking, userId) {
  if (booking.worker_id === userId) return "worker";
  if (booking.client_id === userId) return "client";
  return null;
}

async function refreshApprovedHoursTotal(bookingId, { notifyBalance = false } = {}) {
  await pool.query(
    `UPDATE bookings
     SET approved_hours_total = COALESCE(
       (SELECT SUM(hours_final) FROM work_sessions
        WHERE booking_id = $1 AND status = 'approved' AND hours_final IS NOT NULL),
       0
     )
     WHERE id = $1`,
    [bookingId],
  );
  await refreshHourlyBalanceDue(bookingId, { notifyClient: notifyBalance });
}

async function autoApproveStaleSessions(bookingId) {
  const cutoff = new Date(Date.now() - AUTO_APPROVE_MS).toISOString();
  await pool.query(
    `UPDATE work_sessions
     SET status = 'approved',
         hours_final = COALESCE(hours_client, hours_worker),
         updated_at = NOW()
     WHERE booking_id = $1
       AND status = 'pending_worker'
       AND updated_at <= $2`,
    [bookingId, cutoff],
  );
  await refreshApprovedHoursTotal(bookingId);
}

export const listWorkSessions = async (req, res) => {
  try {
    await ensureDepositsAndCalendarSchema(pool);
    const bookingId = req.query.booking_id ?? req.query.bookingId;
    if (!bookingId) return res.status(400).json({ message: "booking_id required" });

    const booking = await assertBookingParticipant(bookingId, req.user.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    await autoApproveStaleSessions(bookingId);

    const result = await pool.query(
      `SELECT ws.*,
              CASE WHEN $2::uuid = b.worker_id THEN 'worker' ELSE 'client' END AS my_role
       FROM work_sessions ws
       JOIN bookings b ON b.id = ws.booking_id
       WHERE ws.booking_id = $1
       ORDER BY COALESCE(ws.starts_at, ws.created_at) ASC`,
      [bookingId, req.user.id],
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while fetching work sessions" });
  }
};

export const createWorkSession = async (req, res) => {
  try {
    await ensureDepositsAndCalendarSchema(pool);
    const { errors, data } = validateInput(req.body, {
      booking_id: { required: true, type: "uuid" },
      title: { type: "string", maxLen: 300 },
      starts_at: { type: "string" },
      ends_at: { type: "string" },
      calendar_event_id: { type: "uuid" },
    });
    if (errors) return res.status(400).json({ message: errors[0] });

    const booking = await assertBookingParticipant(data.booking_id, req.user.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (!["accepted", "active"].includes(booking.status)) {
      return res.status(400).json({ message: "Work sessions require an accepted booking" });
    }

    const title = sanitizeText(data.title || booking.service_title || "Session").slice(0, 300);
    const startsAt = data.starts_at ? new Date(data.starts_at) : null;
    const endsAt = data.ends_at ? new Date(data.ends_at) : null;

    const result = await pool.query(
      `INSERT INTO work_sessions
         (booking_id, service_id, calendar_event_id, title, starts_at, ends_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        booking.id,
        booking.service_id,
        data.calendar_event_id ?? null,
        title,
        startsAt && !Number.isNaN(startsAt.getTime()) ? startsAt.toISOString() : null,
        endsAt && !Number.isNaN(endsAt.getTime()) ? endsAt.toISOString() : null,
        req.user.id,
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while creating work session" });
  }
};

export const submitWorkSessionHours = async (req, res) => {
  try {
    await ensureDepositsAndCalendarSchema(pool);
    const { id } = req.params;
    const hours = Number(req.body.hours);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
      return res.status(400).json({ message: "Invalid hours (0–24)" });
    }

    const existing = await pool.query(
      `SELECT ws.*, b.worker_id, b.client_id, b.status AS booking_status, s.title AS service_title
       FROM work_sessions ws
       JOIN bookings b ON b.id = ws.booking_id
       JOIN services s ON s.id = ws.service_id
       WHERE ws.id = $1`,
      [id],
    );
    if (existing.rows.length === 0) return res.status(404).json({ message: "Session not found" });

    const session = existing.rows[0];
    if (session.worker_id !== req.user.id) {
      return res.status(403).json({ message: "Only the provider can submit hours" });
    }
    if (!["accepted", "active"].includes(session.booking_status)) {
      return res.status(400).json({ message: "Booking must be active to submit hours" });
    }
    if (!["scheduled", "pending_worker"].includes(session.status)) {
      return res.status(400).json({ message: "Session cannot accept hours in current state" });
    }

    const note = req.body.worker_note != null ? sanitizeText(String(req.body.worker_note)) : session.worker_note;

    const result = await pool.query(
      `UPDATE work_sessions
       SET hours_worker = $1, worker_note = $2, status = 'pending_client',
           last_actor = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [hours, note, req.user.id, id],
    );

    createLocalizedNotification({
      userId: session.client_id,
      type: "work_session",
      link: "/bookings",
      en: {
        title: "Hours submitted",
        body: `Your provider submitted ${hours}h for "${session.service_title}". Please review.`,
      },
      fr: {
        title: "Heures soumises",
        body: `Votre prestataire a soumis ${hours} h pour « ${session.service_title} ». Veuillez valider.`,
      },
    }).catch(() => {});

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while submitting hours" });
  }
};

export const respondWorkSessionAsClient = async (req, res) => {
  try {
    await ensureDepositsAndCalendarSchema(pool);
    const { id } = req.params;
    const action = String(req.body.action || "").toLowerCase();
    if (action !== "approve" && action !== "modify" && action !== "contest") {
      return res.status(400).json({ message: "action must be approve, modify, or contest" });
    }

    const existing = await pool.query(
      `SELECT ws.*, b.worker_id, b.client_id, b.status AS booking_status, s.title AS service_title
       FROM work_sessions ws
       JOIN bookings b ON b.id = ws.booking_id
       JOIN services s ON s.id = ws.service_id
       WHERE ws.id = $1`,
      [id],
    );
    if (existing.rows.length === 0) return res.status(404).json({ message: "Session not found" });

    const session = existing.rows[0];
    if (session.client_id !== req.user.id) {
      return res.status(403).json({ message: "Only the client can respond" });
    }
    if (session.status !== "pending_client") {
      return res.status(400).json({ message: "Session is not awaiting client review" });
    }

    const clientNote =
      req.body.client_note != null ? sanitizeText(String(req.body.client_note)) : session.client_note;

    if (action === "approve") {
      const finalHours = session.hours_worker;
      const result = await pool.query(
        `UPDATE work_sessions
         SET status = 'approved', hours_final = $1, client_note = $2, last_actor = $3, updated_at = NOW()
         WHERE id = $4 RETURNING *`,
        [finalHours, clientNote, req.user.id, id],
      );
      await refreshApprovedHoursTotal(session.booking_id, { notifyBalance: true });
      return res.json(result.rows[0]);
    }

    if (action === "contest") {
      const result = await pool.query(
        `UPDATE work_sessions
         SET status = 'disputed', client_note = $1, last_actor = $2, updated_at = NOW()
         WHERE id = $3 RETURNING *`,
        [clientNote, req.user.id, id],
      );
      createLocalizedNotification({
        userId: session.worker_id,
        type: "work_session",
        link: "/bookings",
        en: { title: "Hours contested", body: `The client contested hours for "${session.service_title}".` },
        fr: { title: "Heures contestées", body: `Le client a contesté les heures pour « ${session.service_title} ».` },
      }).catch(() => {});
      return res.json(result.rows[0]);
    }

    const modifiedHours = Number(req.body.hours);
    if (!Number.isFinite(modifiedHours) || modifiedHours <= 0 || modifiedHours > 24) {
      return res.status(400).json({ message: "Invalid modified hours" });
    }

    const result = await pool.query(
      `UPDATE work_sessions
       SET hours_client = $1, status = 'pending_worker', client_note = $2, last_actor = $3, updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [modifiedHours, clientNote, req.user.id, id],
    );

    createLocalizedNotification({
      userId: session.worker_id,
      type: "work_session",
      link: "/bookings",
      en: {
        title: "Hours modified",
        body: `The client adjusted hours to ${modifiedHours}h for "${session.service_title}".`,
      },
      fr: {
        title: "Heures modifiées",
        body: `Le client a ajusté les heures à ${modifiedHours} h pour « ${session.service_title} ».`,
      },
    }).catch(() => {});

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while responding to session" });
  }
};

export const respondWorkSessionAsWorker = async (req, res) => {
  try {
    await ensureDepositsAndCalendarSchema(pool);
    const { id } = req.params;
    const action = String(req.body.action || "").toLowerCase();
    if (action !== "approve" && action !== "dispute") {
      return res.status(400).json({ message: "action must be approve or dispute" });
    }

    const existing = await pool.query(
      `SELECT ws.*, b.worker_id, b.client_id, s.title AS service_title
       FROM work_sessions ws
       JOIN bookings b ON b.id = ws.booking_id
       JOIN services s ON s.id = ws.service_id
       WHERE ws.id = $1`,
      [id],
    );
    if (existing.rows.length === 0) return res.status(404).json({ message: "Session not found" });

    const session = existing.rows[0];
    if (session.worker_id !== req.user.id) {
      return res.status(403).json({ message: "Only the provider can respond" });
    }
    if (session.status !== "pending_worker") {
      return res.status(400).json({ message: "Session is not awaiting provider review" });
    }

    if (action === "dispute") {
      const result = await pool.query(
        `UPDATE work_sessions SET status = 'disputed', last_actor = $1, updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [req.user.id, id],
      );
      return res.json(result.rows[0]);
    }

    const finalHours = session.hours_client ?? session.hours_worker;
    const result = await pool.query(
      `UPDATE work_sessions
       SET status = 'approved', hours_final = $1, last_actor = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [finalHours, req.user.id, id],
    );
    await refreshApprovedHoursTotal(session.booking_id, { notifyBalance: true });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while responding to session" });
  }
};

export const deleteWorkSession = async (req, res) => {
  try {
    await ensureDepositsAndCalendarSchema(pool);
    const { id } = req.params;
    const existing = await pool.query(
      `SELECT ws.*, b.client_id, b.worker_id
       FROM work_sessions ws
       JOIN bookings b ON b.id = ws.booking_id
       WHERE ws.id = $1`,
      [id],
    );
    if (existing.rows.length === 0) return res.status(404).json({ message: "Session not found" });

    const session = existing.rows[0];
    if (session.client_id !== req.user.id && session.worker_id !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }
    if (!["scheduled", "disputed"].includes(session.status)) {
      return res.status(400).json({ message: "Only scheduled or disputed sessions can be deleted" });
    }

    await pool.query("DELETE FROM work_sessions WHERE id = $1", [id]);
    await refreshApprovedHoursTotal(session.booking_id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while deleting work session" });
  }
};
