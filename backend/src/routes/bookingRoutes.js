import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import {
  createBooking, getMyBookings, updateBookingStatus,
  getReceivedBookings, markCompleted, undoMarkCompleted,
  customizeBooking, requestCancellation, declineCancellation,
  getBookingById, getAdminBookingById, cancelWithDeposit,
} from "../controllers/bookingController.js";
import pool from "../config/db.js";

const router = express.Router();

/**
 * GET /api/bookings/unread-summary
 * Replaces 4 Supabase REST calls in useUnreadBookings — single pool JOIN query.
 */
router.get("/unread-summary", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const since  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { rows } = await pool.query(
      `SELECT
         b.id,
         b.status,
         b.created_at,
         CASE WHEN b.worker_id = $1 THEN 'worker' ELSE 'client' END AS role,
         s.title                                                     AS service_title,
         COALESCE(NULLIF(other_u.company_name, ''), other_u.full_name) AS other_name,
         other_u.avatar                                             AS other_avatar
       FROM bookings b
       JOIN services s ON s.id = b.service_id
       JOIN users other_u ON other_u.id = CASE
         WHEN b.worker_id = $1 THEN b.client_id
         ELSE b.worker_id
       END
       WHERE (
         (b.worker_id = $1 AND b.status = 'pending')
         OR
         (b.client_id = $1 AND b.status IN ('accepted', 'refused') AND b.created_at >= $2)
       )
       ORDER BY b.created_at DESC
       LIMIT 20`,
      [userId, since]
    );

    res.json(rows);
  } catch (err) {
    console.error("unread-summary (bookings) error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", protect, createBooking);
router.get("/my-bookings", protect, getMyBookings);
router.get("/received-bookings", protect, getReceivedBookings);
router.get("/:id/admin", protect, adminOnly, getAdminBookingById);
router.get("/:id", protect, getBookingById);
router.put("/:id/status", protect, updateBookingStatus);
router.post("/:id/complete", protect, markCompleted);
router.post("/:id/uncomplete", protect, undoMarkCompleted);
router.patch("/:id/customize", protect, customizeBooking);
router.post("/:id/cancel-deposit", protect, cancelWithDeposit);
router.post("/:id/cancel-request", protect, requestCancellation);
router.post("/:id/cancel-decline", protect, declineCancellation);

export default router;