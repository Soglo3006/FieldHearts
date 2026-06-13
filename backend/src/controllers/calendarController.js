import pool from "../config/db.js";
import { validateInput, sanitizeText } from "../utils/validate.js";
import {
  ensureDepositsAndCalendarSchema,
  ensureUserCalendarToken,
  findUserIdByCalendarToken,
} from "../utils/depositSchema.js";
import {
  buildGoogleAuthUrl,
  disconnectGoogleCalendar,
  getGoogleConnection,
  handleGoogleOAuthCallback,
  isGoogleCalendarConfigured,
  pullGoogleCalendarChanges,
  syncEventToGoogleParticipants,
  deleteGoogleEvent,
} from "../services/googleCalendarService.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

async function syncCalendarEventToGoogle(event, clientId, workerId) {
  if (event.status === "cancelled") {
    await deleteGoogleEvent(clientId, event.id, event.google_event_id).catch(() => {});
    await deleteGoogleEvent(workerId, event.id, event.google_event_id).catch(() => {});
    return;
  }
  await syncEventToGoogleParticipants(event, clientId, workerId);
}

function formatIcsDate(d) {
  return new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcs(text) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function buildIcs(events, calendarName) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Uneden//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(calendarName)}`,
  ];
  for (const e of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${e.id}@uneden.ca`);
    lines.push(`DTSTAMP:${formatIcsDate(new Date())}`);
    lines.push(`DTSTART:${formatIcsDate(e.starts_at)}`);
    lines.push(`DTEND:${formatIcsDate(e.ends_at)}`);
    lines.push(`SUMMARY:${escapeIcs(e.title)}`);
    if (e.location) lines.push(`LOCATION:${escapeIcs(e.location)}`);
    if (e.notes) lines.push(`DESCRIPTION:${escapeIcs(e.notes)}`);
    lines.push(`STATUS:${e.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function googleCalendarUrl(event) {
  const start = formatIcsDate(event.starts_at).replace(/Z$/, "Z");
  const end = formatIcsDate(event.ends_at).replace(/Z$/, "Z");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title || "Uneden",
    dates: `${start}/${end}`,
  });
  if (event.location) params.set("location", event.location);
  if (event.notes) params.set("details", event.notes);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

async function assertBookingParticipant(bookingId, userId) {
  const result = await pool.query(
    `SELECT b.id, b.service_id, b.client_id, b.worker_id, b.status, s.title
     FROM bookings b
     JOIN services s ON s.id = b.service_id
     WHERE b.id = $1`,
    [bookingId]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  if (row.client_id !== userId && row.worker_id !== userId) return null;
  return row;
}

export const listCalendarEvents = async (req, res) => {
  try {
    await ensureDepositsAndCalendarSchema(pool);
    const userId = req.user.id;
    const from = req.query.from ? new Date(String(req.query.from)) : null;
    const to = req.query.to ? new Date(String(req.query.to)) : null;
    const bookingId = req.query.booking_id ?? req.query.bookingId ?? null;

    const params = [userId];
    let where = `(b.client_id = $1 OR b.worker_id = $1)`;

    if (bookingId) {
      params.push(bookingId);
      where += ` AND ce.booking_id = $${params.length}`;
    }
    if (from && !Number.isNaN(from.getTime())) {
      params.push(from.toISOString());
      where += ` AND ce.ends_at >= $${params.length}`;
    }
    if (to && !Number.isNaN(to.getTime())) {
      params.push(to.toISOString());
      where += ` AND ce.starts_at <= $${params.length}`;
    }

    const result = await pool.query(
      `SELECT ce.*, s.title AS service_title, b.status AS booking_status,
              CASE WHEN b.worker_id = $1 THEN 'worker' ELSE 'client' END AS my_role
       FROM calendar_events ce
       JOIN bookings b ON b.id = ce.booking_id
       JOIN services s ON s.id = ce.service_id
       WHERE ${where}
       ORDER BY ce.starts_at ASC`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while fetching calendar events" });
  }
};

export const createCalendarEvent = async (req, res) => {
  try {
    await ensureDepositsAndCalendarSchema(pool);
    const { errors, data } = validateInput(req.body, {
      booking_id: { required: true, type: "uuid" },
      starts_at: { required: true, type: "string" },
      ends_at: { required: true, type: "string" },
      title: { type: "string", maxLen: 300 },
      location: { type: "string", maxLen: 500 },
      notes: { type: "string", maxLen: 2000 },
    });
    if (errors) return res.status(400).json({ message: errors[0] });

    const booking = await assertBookingParticipant(data.booking_id, req.user.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (!["accepted", "active"].includes(booking.status)) {
      return res.status(400).json({ message: "Calendar events require an accepted booking" });
    }

    const startsAt = new Date(data.starts_at);
    const endsAt = new Date(data.ends_at);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      return res.status(400).json({ message: "Invalid start or end time" });
    }

    const title = sanitizeText(data.title || booking.title || "Service").slice(0, 300);

    const result = await pool.query(
      `INSERT INTO calendar_events
         (booking_id, service_id, title, starts_at, ends_at, location, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        booking.id,
        booking.service_id,
        title,
        startsAt.toISOString(),
        endsAt.toISOString(),
        sanitizeText(data.location || "") || null,
        sanitizeText(data.notes || "") || null,
        req.user.id,
      ]
    );

    const created = result.rows[0];
    await syncCalendarEventToGoogle(created, booking.client_id, booking.worker_id);

    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while creating calendar event" });
  }
};

export const updateCalendarEvent = async (req, res) => {
  try {
    await ensureDepositsAndCalendarSchema(pool);
    const { id } = req.params;
    const existing = await pool.query(
      `SELECT ce.*, b.client_id, b.worker_id, b.status AS booking_status
       FROM calendar_events ce
       JOIN bookings b ON b.id = ce.booking_id
       WHERE ce.id = $1`,
      [id]
    );
    if (existing.rows.length === 0) return res.status(404).json({ message: "Event not found" });

    const event = existing.rows[0];
    if (event.client_id !== req.user.id && event.worker_id !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const startsAt = req.body.starts_at ? new Date(req.body.starts_at) : new Date(event.starts_at);
    const endsAt = req.body.ends_at ? new Date(req.body.ends_at) : new Date(event.ends_at);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      return res.status(400).json({ message: "Invalid start or end time" });
    }

    const title = req.body.title !== undefined ? sanitizeText(String(req.body.title)).slice(0, 300) : event.title;
    const location =
      req.body.location !== undefined ? sanitizeText(String(req.body.location)) || null : event.location;
    const notes = req.body.notes !== undefined ? sanitizeText(String(req.body.notes)) || null : event.notes;
    const status = req.body.status ?? event.status;
    if (!["scheduled", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const result = await pool.query(
      `UPDATE calendar_events
       SET title = $1, starts_at = $2, ends_at = $3, location = $4, notes = $5, status = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [title, startsAt.toISOString(), endsAt.toISOString(), location, notes, status, id]
    );

    const updated = result.rows[0];
    await syncCalendarEventToGoogle(updated, event.client_id, event.worker_id);

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while updating calendar event" });
  }
};

export const getCalendarFeedToken = async (req, res) => {
  try {
    await ensureDepositsAndCalendarSchema(pool);
    const token = await ensureUserCalendarToken(pool, req.user.id);
    const base = process.env.API_PUBLIC_URL || process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
    res.json({
      token,
      feed_url: `${base}/api/calendar/feed/${token}.ics`,
      webcal_url: `webcal://${base.replace(/^https?:\/\//, "")}/api/calendar/feed/${token}.ics`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while generating calendar feed" });
  }
};

/** Public iCal subscription feed (Google Calendar, Apple Calendar, etc.) */
export const getCalendarFeed = async (req, res) => {
  try {
    await ensureDepositsAndCalendarSchema(pool);
    const raw = req.params.token || "";
    const token = raw.replace(/\.ics$/i, "");
    const userId = await findUserIdByCalendarToken(pool, token);
    if (!userId) return res.status(404).send("Not found");

    const result = await pool.query(
      `SELECT ce.*
       FROM calendar_events ce
       JOIN bookings b ON b.id = ce.booking_id
       WHERE (b.client_id = $1 OR b.worker_id = $1)
         AND ce.status != 'cancelled'
         AND ce.starts_at >= NOW() - INTERVAL '90 days'
       ORDER BY ce.starts_at ASC`,
      [userId],
    );

    const ics = buildIcs(result.rows, "Uneden");
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="uneden.ics"');
    res.send(ics);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

export const deleteCalendarEvent = async (req, res) => {
  try {
    await ensureDepositsAndCalendarSchema(pool);
    const { id } = req.params;
    const existing = await pool.query(
      `SELECT ce.*, b.client_id, b.worker_id
       FROM calendar_events ce
       JOIN bookings b ON b.id = ce.booking_id
       WHERE ce.id = $1`,
      [id]
    );
    if (existing.rows.length === 0) return res.status(404).json({ message: "Event not found" });

    const event = existing.rows[0];
    if (event.client_id !== req.user.id && event.worker_id !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await deleteGoogleEvent(req.user.id, event.id, event.google_event_id).catch(() => {});
    if (event.client_id !== event.worker_id) {
      const otherId = event.client_id === req.user.id ? event.worker_id : event.client_id;
      await deleteGoogleEvent(otherId, event.id, event.google_event_id).catch(() => {});
    }

    await pool.query(`DELETE FROM calendar_events WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while deleting calendar event" });
  }
};

export const getGoogleCalendarStatus = async (req, res) => {
  try {
    res.json({
      configured: isGoogleCalendarConfigured(),
      ...(await getGoogleConnection(req.user.id)),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const startGoogleCalendarAuth = async (req, res) => {
  try {
    if (!isGoogleCalendarConfigured()) {
      return res.status(503).json({ message: "Google Calendar is not configured on this server" });
    }
    const url = buildGoogleAuthUrl(req.user.id);
    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to start Google authorization" });
  }
};

export const googleCalendarCallback = async (req, res) => {
  try {
    const { code, state, error } = req.query;
    if (error) {
      return res.redirect(`${FRONTEND_URL}/calendar?google=error`);
    }
    await handleGoogleOAuthCallback(String(code), String(state));
    res.redirect(`${FRONTEND_URL}/calendar?google=connected`);
  } catch (err) {
    console.error(err);
    res.redirect(`${FRONTEND_URL}/calendar?google=error`);
  }
};

export const disconnectGoogle = async (req, res) => {
  try {
    await disconnectGoogleCalendar(req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to disconnect Google Calendar" });
  }
};

export const syncGoogleCalendar = async (req, res) => {
  try {
    const connection = await getGoogleConnection(req.user.id);
    if (!connection.connected) {
      return res.status(400).json({ message: "Google Calendar is not connected" });
    }
    const pull = await pullGoogleCalendarChanges(req.user.id);

    const events = await pool.query(
      `SELECT ce.*, b.client_id, b.worker_id
       FROM calendar_events ce
       JOIN bookings b ON b.id = ce.booking_id
       WHERE (b.client_id = $1 OR b.worker_id = $1)
         AND ce.status = 'scheduled'
         AND ce.starts_at >= NOW() - INTERVAL '90 days'`,
      [req.user.id],
    );
    for (const ev of events.rows) {
      await syncCalendarEventToGoogle(ev, ev.client_id, ev.worker_id);
    }

    res.json({ pulled: pull.updated, pushed: events.rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Google Calendar sync failed" });
  }
};
