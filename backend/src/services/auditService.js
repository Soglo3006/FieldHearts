import pool from "../config/db.js";

/**
 * Log a sensitive admin action.
 *
 * @param {object} opts
 * @param {string} opts.adminId     - UUID of the admin user
 * @param {string} opts.adminEmail  - Email of the admin user
 * @param {string} opts.action      - Action identifier, e.g. "dispute.resolve"
 * @param {string} [opts.targetType] - Entity type, e.g. "dispute", "user", "payout"
 * @param {string} [opts.targetId]   - Entity ID
 * @param {object} [opts.details]    - Free-form JSONB details
 * @param {string} [opts.ipAddress]  - Client IP address
 */
export async function logAdminAction({ adminId, adminEmail, action, targetType, targetId, details, ipAddress }) {
  try {
    await pool.query(
      `INSERT INTO admin_audit_logs (admin_id, admin_email, action, target_type, target_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        adminId,
        adminEmail,
        action,
        targetType ?? null,
        targetId   != null ? String(targetId) : null,
        details    ? JSON.stringify(details) : null,
        ipAddress  ?? null,
      ]
    );
  } catch (err) {
    // Never let audit logging crash the main request
    console.error("[audit] Failed to log admin action:", err.message);
  }
}
