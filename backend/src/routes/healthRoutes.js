import express from "express";
import pool from "../config/db.js";

const router = express.Router();

/**
 * GET /api/health
 * Returns server + database status.
 * Used by uptime monitors and internal alerts.
 */
router.get("/", async (req, res) => {
  const start = Date.now();
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "ok",
      db: "ok",
      uptime: process.uptime(),
      responseTime: `${Date.now() - start}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: "error",
      db: "unreachable",
      error: "Database connection failed",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
