import crypto from "crypto";
import pool from "../config/db.js";
import { ensureDepositsAndCalendarSchema } from "../utils/depositSchema.js";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

function getOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
    `${process.env.API_PUBLIC_URL || process.env.BACKEND_URL || "http://localhost:5000"}/api/calendar/google/callback`;
  return { clientId, clientSecret, redirectUri };
}

function signState(userId) {
  const secret = process.env.JWT_SECRET || "dev";
  const payload = `${userId}.${Date.now()}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifyState(state) {
  const secret = process.env.JWT_SECRET || "dev";
  const decoded = Buffer.from(state, "base64url").toString("utf8");
  const lastDot = decoded.lastIndexOf(".");
  if (lastDot === -1) return null;
  const payload = decoded.slice(0, lastDot);
  const sig = decoded.slice(lastDot + 1);
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  if (sig !== expected) return null;
  const userId = payload.split(".")[0];
  const ts = Number(payload.split(".")[1]);
  if (!userId || !Number.isFinite(ts) || Date.now() - ts > 15 * 60 * 1000) return null;
  return userId;
}

export function buildGoogleAuthUrl(userId) {
  const { clientId, redirectUri } = getOAuthConfig();
  if (!clientId) throw new Error("Google Calendar is not configured");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: CALENDAR_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state: signState(userId),
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

async function exchangeCodeForTokens(code) {
  const { clientId, clientSecret, redirectUri } = getOAuthConfig();
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed: ${text}`);
  }
  return res.json();
}

export async function saveGoogleTokens(userId, tokens) {
  await ensureDepositsAndCalendarSchema(pool);
  const existing = await pool.query(
    "SELECT google_calendar_refresh_token FROM users WHERE id = $1",
    [userId],
  );
  const refreshToken =
    tokens.refresh_token ?? existing.rows[0]?.google_calendar_refresh_token ?? null;
  const expiry = tokens.expires_in
    ? new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString()
    : null;
  await pool.query(
    `UPDATE users
     SET google_calendar_refresh_token = COALESCE($1, google_calendar_refresh_token),
         google_calendar_access_token = $2,
         google_calendar_token_expiry = $3
     WHERE id = $4`,
    [refreshToken, tokens.access_token, expiry, userId],
  );
}

export async function disconnectGoogleCalendar(userId) {
  await pool.query(
    `UPDATE users
     SET google_calendar_refresh_token = NULL,
         google_calendar_access_token = NULL,
         google_calendar_token_expiry = NULL
     WHERE id = $1`,
    [userId],
  );
}

export async function getGoogleConnection(userId) {
  await ensureDepositsAndCalendarSchema(pool);
  const r = await pool.query(
    `SELECT google_calendar_refresh_token IS NOT NULL AS connected
     FROM users WHERE id = $1`,
    [userId],
  );
  return { connected: !!r.rows[0]?.connected };
}

async function refreshAccessToken(userId, refreshToken) {
  const { clientId, clientSecret } = getOAuthConfig();
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error("Failed to refresh Google token");
  const tokens = await res.json();
  const expiry = tokens.expires_in
    ? new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString()
    : null;
  await pool.query(
    `UPDATE users SET google_calendar_access_token = $1, google_calendar_token_expiry = $2 WHERE id = $3`,
    [tokens.access_token, expiry, userId],
  );
  return tokens.access_token;
}

export async function getValidAccessToken(userId) {
  const r = await pool.query(
    `SELECT google_calendar_refresh_token, google_calendar_access_token, google_calendar_token_expiry
     FROM users WHERE id = $1`,
    [userId],
  );
  const row = r.rows[0];
  if (!row?.google_calendar_refresh_token) return null;

  const expiry = row.google_calendar_token_expiry
    ? new Date(row.google_calendar_token_expiry).getTime()
    : 0;
  if (row.google_calendar_access_token && expiry > Date.now() + 60_000) {
    return row.google_calendar_access_token;
  }
  return refreshAccessToken(userId, row.google_calendar_refresh_token);
}

function toGoogleEvent(event) {
  return {
    summary: event.title,
    location: event.location || undefined,
    description: event.notes || undefined,
    start: { dateTime: new Date(event.starts_at).toISOString() },
    end: { dateTime: new Date(event.ends_at).toISOString() },
    extendedProperties: {
      private: {
        uneden_event_id: event.id,
        uneden_booking_id: event.booking_id,
      },
    },
  };
}

export async function pushEventToGoogle(userId, event) {
  const token = await getValidAccessToken(userId);
  if (!token) return null;

  const syncRow = await pool.query(
    `SELECT google_event_id FROM calendar_event_google_sync
     WHERE calendar_event_id = $1 AND user_id = $2`,
    [event.id, userId],
  );
  let googleEventId = syncRow.rows[0]?.google_event_id ?? event.google_event_id ?? null;

  const body = toGoogleEvent(event);

  if (googleEventId) {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(googleEventId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    if (res.ok) {
      await pool.query(
        `INSERT INTO calendar_event_google_sync (calendar_event_id, user_id, google_event_id, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (calendar_event_id, user_id) DO UPDATE SET google_event_id = $3, updated_at = NOW()`,
        [event.id, userId, googleEventId],
      );
      return googleEventId;
    }
    if (res.status !== 404) return null;
    googleEventId = null;
  }

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) return null;
  const data = await res.json();
  await pool.query(
    `INSERT INTO calendar_event_google_sync (calendar_event_id, user_id, google_event_id, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (calendar_event_id, user_id) DO UPDATE SET google_event_id = $3, updated_at = NOW()`,
    [event.id, userId, data.id],
  );
  await pool.query(
    `UPDATE calendar_events SET google_event_id = COALESCE(google_event_id, $1) WHERE id = $2`,
    [data.id, event.id],
  );
  return data.id;
}

export async function syncEventToGoogleParticipants(event, clientId, workerId) {
  if (event.status === "cancelled") return;
  await pushEventToGoogle(clientId, event).catch(() => {});
  if (workerId !== clientId) {
    await pushEventToGoogle(workerId, event).catch(() => {});
  }
}

export async function deleteGoogleEvent(userId, calendarEventId, googleEventId) {
  if (!googleEventId) {
    const r = await pool.query(
      `SELECT google_event_id FROM calendar_event_google_sync
       WHERE calendar_event_id = $1 AND user_id = $2`,
      [calendarEventId, userId],
    );
    googleEventId = r.rows[0]?.google_event_id;
  }
  if (!googleEventId) return;
  const token = await getValidAccessToken(userId);
  if (!token) return;
  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(googleEventId)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
  );
  await pool.query(
    `DELETE FROM calendar_event_google_sync WHERE calendar_event_id = $1 AND user_id = $2`,
    [calendarEventId, userId],
  );
}

/** Pull Google events linked to Uneden and update local copies. */
export async function pullGoogleCalendarChanges(userId) {
  const token = await getValidAccessToken(userId);
  if (!token) return { updated: 0 };

  const timeMin = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const params = new URLSearchParams({
    timeMin,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
    privateExtendedProperty: "uneden_event_id",
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return { updated: 0 };

  const data = await res.json();
  let updated = 0;

  for (const item of data.items || []) {
    const unedenId = item.extendedProperties?.private?.uneden_event_id;
    if (!unedenId) continue;

    const starts = item.start?.dateTime || item.start?.date;
    const ends = item.end?.dateTime || item.end?.date;
    if (!starts || !ends) continue;

    const result = await pool.query(
      `UPDATE calendar_events ce
       SET title = $1, starts_at = $2, ends_at = $3, location = $4, notes = $5,
           google_event_id = $6, updated_at = NOW()
       FROM bookings b
       WHERE ce.id = $7
         AND ce.booking_id = b.id
         AND (b.client_id = $8 OR b.worker_id = $8)
       RETURNING ce.id`,
      [
        item.summary || "Session",
        new Date(starts).toISOString(),
        new Date(ends).toISOString(),
        item.location || null,
        item.description || null,
        item.id,
        unedenId,
        userId,
      ],
    );
    if (result.rowCount > 0) updated += 1;
  }

  return { updated };
}

export async function handleGoogleOAuthCallback(code, state) {
  const userId = verifyState(state);
  if (!userId) throw new Error("Invalid OAuth state");
  const tokens = await exchangeCodeForTokens(code);
  if (!tokens.refresh_token && !tokens.access_token) {
    throw new Error("No tokens returned from Google");
  }
  await saveGoogleTokens(userId, tokens);
  return userId;
}

export function isGoogleCalendarConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}
