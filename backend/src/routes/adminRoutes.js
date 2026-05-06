import crypto from "crypto";
import jwt from "jsonwebtoken";
import express from "express";
import {
  protect,
  adminOnly,
  adminIdentityOnly,
  verifyAdminStepUp,
} from "../middleware/authMiddleware.js";
import { notifyAdminEmailOtp } from "../services/emailService.js";
import pool from "../config/db.js";

const router = express.Router();

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_COOLDOWN_MS = 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 8;

/** @type {Map<string, { hash: string, expiresAt: number, attempts: number }>} */
const otpState = new Map();
/** @type {Map<string, number>} */
const otpLastSend = new Map();

function otpPepper() {
  return process.env.ADMIN_OTP_PEPPER || process.env.SUPABASE_JWT_SECRET;
}

function hashOtp(userId, code) {
  return crypto.createHash("sha256").update(`${userId}:${code}:${otpPepper()}`).digest("hex");
}

function safeEqualHex(a, b) {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

// ── Email OTP step-up (Apple-style 6-digit code, no authenticator app) ───────

router.get("/email-otp/status", protect, adminIdentityOnly, (req, res) => {
  const step = verifyAdminStepUp(req);
  if (step.ok) return res.json({ ok: true, via: step.via });
  return res.json({ ok: false, stepup_required: true });
});

router.post("/email-otp/send", protect, adminIdentityOnly, async (req, res) => {
  const userId = req.user.id;
  const email = req.user.email;
  if (!email) {
    return res.status(400).json({ message: "Pas d'e-mail sur le compte." });
  }

  const last = otpLastSend.get(userId) || 0;
  if (Date.now() - last < OTP_COOLDOWN_MS) {
    const wait = Math.ceil((OTP_COOLDOWN_MS - (Date.now() - last)) / 1000);
    return res.status(429).json({ message: `Attendez ${wait} s avant un nouvel envoi.` });
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const hash = hashOtp(userId, code);
  otpState.set(userId, { hash, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });
  otpLastSend.set(userId, Date.now());

  const sent = await notifyAdminEmailOtp(email, code);
  if (!sent) {
    otpState.delete(userId);
    return res.status(503).json({ message: "Impossible d'envoyer l'e-mail. Réessayez plus tard." });
  }

  return res.json({ ok: true });
});

router.post("/email-otp/verify", protect, adminIdentityOnly, (req, res) => {
  const userId = req.user.id;
  const email = req.user.email;
  const raw = req.body?.code;
  const code = typeof raw === "string" ? raw.replace(/\D/g, "") : "";
  if (code.length !== 6) {
    return res.status(400).json({ message: "Code à 6 chiffres requis." });
  }

  const entry = otpState.get(userId);
  if (!entry || Date.now() > entry.expiresAt) {
    otpState.delete(userId);
    return res.status(400).json({ message: "Code expiré ou absent. Demandez un nouveau code." });
  }

  if (entry.attempts >= MAX_VERIFY_ATTEMPTS) {
    otpState.delete(userId);
    return res.status(429).json({ message: "Trop de tentatives. Demandez un nouveau code." });
  }

  const h = hashOtp(userId, code);
  if (!safeEqualHex(h, entry.hash)) {
    entry.attempts += 1;
    return res.status(400).json({ message: "Code incorrect." });
  }

  otpState.delete(userId);

  const secret = process.env.ADMIN_STEPUP_SECRET || process.env.SUPABASE_JWT_SECRET;
  const stepupToken = jwt.sign(
    {
      sub: userId,
      email: email ? String(email).toLowerCase() : undefined,
      purpose: "admin_stepup",
    },
    secret,
    { expiresIn: "12h" }
  );

  return res.json({ ok: true, stepup_token: stepupToken });
});

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
