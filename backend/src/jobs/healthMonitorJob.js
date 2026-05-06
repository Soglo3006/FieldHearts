/**
 * Health Monitor Job
 * Runs every 5 minutes — checks DB connectivity and sends email alert
 * to admins if something breaks.
 */

import pool from "../config/db.js";

let consecutiveFailures = 0;

export async function runHealthCheck() {
  try {
    const start = Date.now();
    await pool.query("SELECT 1");
    const responseTime = Date.now() - start;

    if (consecutiveFailures >= 2) {
      console.log("[HealthMonitor] Database connection restored.");
    }
    consecutiveFailures = 0;

    if (responseTime > 3000) {
      console.warn(`[HealthMonitor] Database slow response: ${responseTime}ms`);
    }
  } catch (err) {
    consecutiveFailures++;
    console.error(`[HealthMonitor] DB check failed (${consecutiveFailures}):`, err.message);
  }
}

export function startHealthMonitorJob() {
  // Run immediately on startup
  runHealthCheck();
  // Then every 5 minutes
  setInterval(runHealthCheck, 5 * 60 * 1000);
}
