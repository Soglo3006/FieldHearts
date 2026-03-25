import pool from "../config/db.js";

/**
 * Create an in-app notification for a user.
 * Fires-and-forgets; never throws.
 */
export async function createNotification({ userId, type, title, body, link = null }) {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, link)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, title, body, link]
    );
  } catch (err) {
    console.error("Failed to create notification:", err.message);
  }
}

/**
 * Look up a user's preferred language from their settings.
 * Defaults to "fr" if not set.
 */
async function getUserLang(userId) {
  try {
    const result = await pool.query(
      `SELECT settings->>'language' AS lang FROM users WHERE id = $1`,
      [userId]
    );
    const lang = result.rows[0]?.lang;
    return lang === "en" ? "en" : "fr";
  } catch {
    return "fr";
  }
}

/**
 * Create a bilingual notification — picks the right language based on the recipient's settings.
 *
 * @param {object} opts
 * @param {string} opts.userId  - recipient user UUID
 * @param {string} opts.type
 * @param {string} [opts.link]
 * @param {{ title: string, body: string }} opts.en - English strings
 * @param {{ title: string, body: string }} opts.fr - French strings
 */
export async function createLocalizedNotification({ userId, type, link = null, en, fr }) {
  const lang = await getUserLang(userId);
  const strings = lang === "en" ? en : fr;
  return createNotification({ userId, type, title: strings.title, body: strings.body, link });
}

/**
 * Check if a user has email enabled for a given category.
 * Returns true (send) if no preference row exists yet (defaults all ON).
 *
 * @param {string} userId
 * @param {'message'|'payment'|'listing'|'complaint'} category
 */
export async function shouldSendEmail(userId, category) {
  try {
    const result = await pool.query(
      `SELECT email_messages, email_payments, email_listings, email_complaints
       FROM notification_preferences WHERE user_id = $1`,
      [userId]
    );
    if (result.rows.length === 0) return true;
    const p = result.rows[0];
    switch (category) {
      case "message":   return p.email_messages;
      case "payment":   return p.email_payments;
      case "listing":   return p.email_listings;
      case "complaint": return p.email_complaints;
      default:          return true;
    }
  } catch {
    return true; // fail open
  }
}
