import pool from "../config/db.js";
import { notifyWelcome } from "./emailService.js";
import { getUserLang } from "./notificationService.js";

pool.query(`
  ALTER TABLE users
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMPTZ
`).catch((err) => console.error("[DB] users.welcome_email_sent_at:", err.message));

/** Sends the welcome email at most once per user (idempotent). */
export async function sendWelcomeEmailOnce(userId) {
  const result = await pool.query(
    `UPDATE users
     SET welcome_email_sent_at = NOW()
     WHERE id = $1 AND welcome_email_sent_at IS NULL
     RETURNING email, full_name, company_name, account_type`,
    [userId],
  );

  if (!result.rows.length) return false;

  const user = result.rows[0];
  const displayName =
    user.account_type === "company" ? user.company_name : user.full_name;
  const lang = await getUserLang(userId);

  await notifyWelcome(user.email, displayName || user.email, lang);
  return true;
}
