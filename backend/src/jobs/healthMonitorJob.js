/**
 * Health Monitor Job
 * Runs every 5 minutes — checks DB connectivity and sends email alert
 * to admins if something breaks.
 */

import pool from "../config/db.js";
import { Resend } from "resend";

let _resend = null;
const getResend = () => {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
};

// Track consecutive failures to avoid spam (alert only after 2 failures in a row)
let consecutiveFailures = 0;
let lastAlertSent = null;
const ALERT_COOLDOWN_MS = 30 * 60 * 1000; // don't re-alert within 30 minutes

async function sendAlertEmail(subject, body) {
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (adminEmails.length === 0) return;

  try {
    await getResend().emails.send({
      from: `Uneden Alerts <noreply@uneden.ca>`,
      to: adminEmails,
      subject: `🚨 [Uneden Alert] ${subject}`,
      html: `
        <div style="font-family:Arial,sans-serif;padding:24px;background:#fff1f2;border-left:4px solid #dc2626;border-radius:8px;">
          <h2 style="color:#dc2626;margin-top:0;">⚠️ ${subject}</h2>
          <p style="color:#374151;">${body}</p>
        </div>
      `,
    });
    lastAlertSent = Date.now();
  } catch (err) {
    console.error("[HealthMonitor] Failed to send alert email:", err.message);
  }
}

async function sendRecoveryEmail(subject) {
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (adminEmails.length === 0) return;

  try {
    await getResend().emails.send({
      from: `Uneden Alerts <noreply@uneden.ca>`,
      to: adminEmails,
      subject: `✅ [Uneden] ${subject}`,
      html: `
        <div style="font-family:Arial,sans-serif;padding:24px;background:#f0fdf4;border-left:4px solid #16a34a;border-radius:8px;">
          <h2 style="color:#16a34a;margin-top:0;">✅ ${subject}</h2>
          <p style="color:#374151;">The service has recovered and is operating normally.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[HealthMonitor] Failed to send recovery email:", err.message);
  }
}

export async function runHealthCheck() {
  try {
    const start = Date.now();
    await pool.query("SELECT 1");
    const responseTime = Date.now() - start;

    // DB is healthy
    if (consecutiveFailures >= 2) {
      // Was down before — send recovery alert
      await sendRecoveryEmail("Database connection restored");
    }
    consecutiveFailures = 0;

    // Alert if DB response is very slow (>3s)
    if (responseTime > 3000) {
      const cooldownPassed = !lastAlertSent || Date.now() - lastAlertSent > ALERT_COOLDOWN_MS;
      if (cooldownPassed) {
        await sendAlertEmail(
          "Database slow response",
          "The database is responding slowly. This may indicate performance issues."
        );
      }
    }
  } catch (err) {
    consecutiveFailures++;
    console.error(`[HealthMonitor] DB check failed (${consecutiveFailures}):`, err.message);

    // Only alert after 2 consecutive failures and cooldown passed
    const cooldownPassed = !lastAlertSent || Date.now() - lastAlertSent > ALERT_COOLDOWN_MS;
    if (consecutiveFailures >= 2 && cooldownPassed) {
      await sendAlertEmail(
        "Database connection failed",
        "The database has been unreachable for multiple consecutive checks."
      );
    }
  }
}

export function startHealthMonitorJob() {
  // Run immediately on startup
  runHealthCheck();
  // Then every 5 minutes
  setInterval(runHealthCheck, 5 * 60 * 1000);
}
