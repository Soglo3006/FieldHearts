import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import pool from "../config/db.js";

const router = express.Router();

// GET /api/admin/audit-logs?limit=50&offset=0&action=dispute.resolve
router.get("/audit-logs", protect, adminOnly, async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit  || "50",  10), 200);
    const offset = Math.max(parseInt(req.query.offset || "0",   10), 0);
    const action = req.query.action || null;

    const params = [limit, offset];
    let whereClause = "";
    if (action) {
      params.push(action);
      whereClause = `WHERE action = $${params.length}`;
    }

    const result = await pool.query(
      `SELECT id, admin_id, admin_email, action, target_type, target_id, details, ip_address, created_at
       FROM admin_audit_logs
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM admin_audit_logs ${whereClause}`,
      action ? [action] : []
    );

    res.json({
      total: Number(countResult.rows[0]?.total ?? 0),
      logs:  result.rows,
    });
  } catch (err) {
    console.error("audit-logs error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
