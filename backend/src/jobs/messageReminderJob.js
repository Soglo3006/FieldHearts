import cron from "node-cron";
import pool from "../config/db.js";
import { notifyUnreadReminder } from "../services/emailService.js";
import { getUserLang } from "../services/notificationService.js";

/**
 * Runs every hour.
 * Uses direct DB pool — zero Supabase egress.
 */
const runReminders = async () => {
  try {
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const cutoff7d  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000);

    // Find all (recipient, chat_room) pairs with unread messages older than 24h
    // where the recipient hasn't been reminded in the last 24h and wasn't online recently
    const { rows } = await pool.query(
      `SELECT
         crm.user_id,
         crm.chat_room_id,
         u.email,
         COALESCE(NULLIF(u.company_name, ''), u.full_name) AS display_name,
         up.last_seen,
         COUNT(m.id) AS unread_count,
         MAX(m.user_id::text)::uuid AS sender_id
       FROM chat_room_member crm
       JOIN users u ON u.id = crm.user_id
       LEFT JOIN user_presence up ON up.user_id = crm.user_id
       JOIN messages m
         ON m.chat_room_id = crm.chat_room_id
        AND m.user_id <> crm.user_id
        AND m.read_at IS NULL
        AND m.deleted_at IS NULL
        AND m.created_at < $1
        AND m.created_at > $2
       WHERE crm.is_deleted = false
         AND (crm.last_reminder_sent_at IS NULL OR crm.last_reminder_sent_at < $1)
         AND (up.last_seen IS NULL OR up.last_seen < $1)
         AND u.email IS NOT NULL
       GROUP BY crm.user_id, crm.chat_room_id, u.email, u.company_name, u.full_name, up.last_seen
       HAVING COUNT(m.id) > 0`,
      [cutoff24h.toISOString(), cutoff7d.toISOString()]
    );

    if (!rows.length) return;

    // Batch fetch sender names
    const senderIds = [...new Set(rows.map((r) => r.sender_id).filter(Boolean))];
    let senderNames = {};
    if (senderIds.length > 0) {
      const senders = await pool.query(
        `SELECT id, COALESCE(NULLIF(company_name, ''), full_name) AS display_name FROM users WHERE id = ANY($1)`,
        [senderIds]
      );
      senders.rows.forEach((s) => { senderNames[s.id] = s.display_name; });
    }

    for (const row of rows) {
      const senderName = senderNames[row.sender_id] || "Quelqu'un";
      const lang = await getUserLang(row.user_id);
      await notifyUnreadReminder(row.email, row.display_name, senderName, Number(row.unread_count), lang);

      await pool.query(
        `UPDATE chat_room_member SET last_reminder_sent_at = NOW()
         WHERE user_id = $1 AND chat_room_id = $2`,
        [row.user_id, row.chat_room_id]
      );

    }
  } catch (err) {
    console.error("Reminder job error:", err.message);
  }
};

export const startMessageReminderJob = () => {
  cron.schedule("0 * * * *", () => {
    runReminders();
  });
};
