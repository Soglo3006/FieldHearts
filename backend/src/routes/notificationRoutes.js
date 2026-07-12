import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { supabaseAdmin } from "../lib/supabase.js";
import pool from "../config/db.js";
import { enrichNotificationRow } from "../services/notificationService.js";

const router = express.Router();

// GET /notifications/vapid-public-key
router.get("/vapid-public-key", (_req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// POST /notifications/subscribe
router.post("/subscribe", protect, async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ message: "Invalid subscription object" });
  }
  try {
    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .upsert(
        { user_id: req.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
        { onConflict: "user_id,endpoint" }
      );
    if (error) throw error;
    res.status(201).json({ message: "Subscribed" });
  } catch (err) {
    console.error("Subscribe error:", err.message);
    res.status(500).json({ message: "Failed to save subscription" });
  }
});

// DELETE /notifications/unsubscribe
router.delete("/unsubscribe", protect, async (req, res) => {
  const { endpoint } = req.body;
  try {
    await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .eq("user_id", req.user.id)
      .eq("endpoint", endpoint);
    res.json({ message: "Unsubscribed" });
  } catch (err) {
    res.status(500).json({ message: "Failed to unsubscribe" });
  }
});

// ─── In-app notifications CRUD ────────────────────────────────────────────────

// GET /notifications — list recent 50 for current user
router.get("/", protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.id, n.type, n.title, n.body, n.link, n.read_at, n.created_at,
              COALESCE(s.title, fix.service_title, title_match.service_title) AS service_title,
              COALESCE(b.id, fix.booking_id, title_match.booking_id) AS resolved_booking_id,
              COALESCE(
                NULLIF(s.image_urls[1], ''),
                NULLIF(s.image_url, ''),
                NULLIF(fix.service_image_url, ''),
                NULLIF(title_match.service_image_url, '')
              ) AS service_image_url,
              COALESCE(msg.sender_name, applicant.applicant_name) AS sender_name,
              COALESCE(msg.sender_avatar, applicant.applicant_avatar) AS sender_avatar
       FROM notifications n
       LEFT JOIN bookings b
         ON n.link ~ 'booking=[0-9a-fA-F-]{36}'
        AND b.id = (substring(n.link from 'booking=([0-9a-fA-F-]{36})'))::uuid
       LEFT JOIN services s ON s.id = b.service_id
       LEFT JOIN LATERAL (
         SELECT bk.id AS booking_id,
                sv.title AS service_title,
                COALESCE(NULLIF(sv.image_urls[1], ''), NULLIF(sv.image_url, '')) AS service_image_url
         FROM bookings bk
         JOIN services sv ON sv.id = bk.service_id
         WHERE n.type = 'booking_completed'
           AND n.body LIKE '%undefined%'
           AND b.id IS NULL
           AND (bk.client_id = n.user_id OR bk.worker_id = n.user_id)
           AND bk.status = 'completed'
         ORDER BY ABS(EXTRACT(EPOCH FROM (n.created_at - COALESCE(bk.completed_at, bk.created_at))))
         LIMIT 1
       ) fix ON true
       LEFT JOIN LATERAL (
         SELECT bk.id AS booking_id,
                sv.title AS service_title,
                COALESCE(NULLIF(sv.image_urls[1], ''), NULLIF(sv.image_url, '')) AS service_image_url
         FROM bookings bk
         JOIN services sv ON sv.id = bk.service_id
         WHERE b.id IS NULL
           AND n.type IN ('booking_request', 'booking_accepted', 'booking_rejected', 'booking_completed')
           AND (bk.client_id = n.user_id OR bk.worker_id = n.user_id)
           AND n.body ILIKE '%' || sv.title || '%'
         ORDER BY LENGTH(sv.title) DESC,
                  ABS(EXTRACT(EPOCH FROM (n.created_at - bk.created_at)))
         LIMIT 1
       ) title_match ON true
       LEFT JOIN LATERAL (
         SELECT COALESCE(NULLIF(u.company_name, ''), u.full_name) AS sender_name,
                u.avatar AS sender_avatar
         FROM chat_room_member crm
         JOIN users u ON u.id = crm.user_id
         WHERE n.type = 'message'
           AND n.link ~ 'chat='
           AND crm.chat_room_id = (substring(n.link from 'chat=([^&]+)'))::uuid
           AND crm.user_id <> n.user_id
         LIMIT 1
       ) msg ON true
       LEFT JOIN LATERAL (
         SELECT COALESCE(NULLIF(u.company_name, ''), u.full_name) AS applicant_name,
                u.avatar AS applicant_avatar
         FROM users u
         WHERE n.type = 'booking_request'
           AND b.id IS NOT NULL
           AND u.id = CASE
             WHEN b.client_id = n.user_id THEN b.worker_id
             ELSE b.client_id
           END
         LIMIT 1
       ) applicant ON true
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json(result.rows.map(enrichNotificationRow));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /notifications/unread-count
router.get("/unread-count", protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
      [req.user.id]
    );
    res.json({ count: result.rows[0].count });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH /notifications/read-all — mark all unread as read
router.patch("/read-all", protect, async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL`,
      [req.user.id]
    );
    res.json({ message: "All marked as read" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /notifications/all — delete all for current user
router.delete("/all", protect, async (req, res) => {
  try {
    await pool.query(`DELETE FROM notifications WHERE user_id = $1`, [req.user.id]);
    res.json({ message: "All deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH /notifications/:id/read — mark one as read
router.patch("/:id/read", protect, async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /notifications/:id — delete one
router.delete("/:id", protect, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── Email preferences ────────────────────────────────────────────────────────

// GET /notifications/preferences
router.get("/preferences", protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT email_messages, email_payments, email_listings, email_complaints
       FROM notification_preferences WHERE user_id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      // Return defaults if no row yet
      return res.json({ email_messages: true, email_payments: true, email_listings: true, email_complaints: true });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /notifications/preferences
router.put("/preferences", protect, async (req, res) => {
  const { email_messages, email_payments, email_listings, email_complaints } = req.body;
  try {
    await pool.query(
      `INSERT INTO notification_preferences (user_id, email_messages, email_payments, email_listings, email_complaints, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         email_messages = EXCLUDED.email_messages,
         email_payments = EXCLUDED.email_payments,
         email_listings = EXCLUDED.email_listings,
         email_complaints = EXCLUDED.email_complaints,
         updated_at = NOW()`,
      [req.user.id, email_messages ?? true, email_payments ?? true, email_listings ?? true, email_complaints ?? true]
    );
    res.json({ message: "Preferences saved" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
