import crypto from "crypto";
import pool from "../config/db.js";
import { notifyPasswordChanged, notifyPasswordChangeOtp, notifyWaitlistConfirmation } from "../services/emailService.js";
import { getUserLang } from "../services/notificationService.js";
import { sendWelcomeEmailOnce } from "../services/userWelcomeService.js";
import { supabaseAdmin, supabaseAnon } from "../lib/supabase.js";

// ── Email OTP step-up for password changes (same pattern as admin sign-in) ───
const PASSWORD_OTP_TTL_MS = 10 * 60 * 1000;
const PASSWORD_OTP_COOLDOWN_MS = 60 * 1000;
const PASSWORD_OTP_MAX_ATTEMPTS = 8;

/** @type {Map<string, { hash: string, expiresAt: number, attempts: number }>} */
const passwordOtpState = new Map();
/** @type {Map<string, number>} */
const passwordOtpLastSend = new Map();

function passwordOtpPepper() {
  return process.env.ADMIN_OTP_PEPPER || process.env.SUPABASE_JWT_SECRET;
}

function hashPasswordOtp(userId, code) {
  return crypto.createHash("sha256").update(`${userId}:${code}:${passwordOtpPepper()}`).digest("hex");
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

export const joinWaitlist = async (req, res) => {
  try {
    const { email, lang } = req.body;
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ message: "Adresse courriel invalide." });
    }

    // Create table if it doesn't exist (idempotent)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        lang TEXT DEFAULT 'fr',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(email)
      )
    `);

    const result = await pool.query(
      "INSERT INTO waitlist (email, lang) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING id",
      [email.toLowerCase().trim(), lang || "fr"]
    );

    // Send confirmation email only for new signups (not duplicates)
    if (result.rowCount > 0) {
      notifyWaitlistConfirmation(email.toLowerCase().trim(), lang || "fr").catch(() => {});
    }

    res.json({ success: true });
  } catch (err) {
    console.error("joinWaitlist error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const exportWaitlist = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT email, lang, created_at FROM waitlist ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("exportWaitlist error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "Email requis" });
    }
    const result = await pool.query(
      "SELECT id FROM auth.users WHERE email = $1 LIMIT 1",
      [email.toLowerCase().trim()]
    );
    res.json({ exists: result.rows.length > 0 });
  } catch (err) {
    console.error("checkEmail error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/** Shared validation + old-password check for both the OTP request and the actual change. */
async function validateAndVerifyOldPassword(userId, oldPassword, newPassword) {
    if (!oldPassword || !newPassword) {
        return { error: { status: 400, body: { message: "Old password and new password are required" } } };
    }
    if (newPassword.length < 8) {
        return { error: { status: 400, body: { message: "New password must be at least 8 characters" } } };
    }
    if (oldPassword === newPassword) {
        return { error: { status: 400, body: { message: "New password must be different from current password" } } };
    }

    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
        return { error: { status: 404, body: { message: "User not found" } } };
    }
    const user = result.rows[0];

    // Credentials live in Supabase Auth, not this table — verify the current password there.
    if (!supabaseAnon) {
        return { error: { status: 500, body: { message: "Server error while changing password" } } };
    }
    const { error: verifyError } = await supabaseAnon.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
    });
    if (verifyError) {
        return { error: { status: 401, body: { message: "Current password is incorrect" } } };
    }

    return { user };
}

/** Step 1 — verify the current password, then email a 6-digit code the user must enter to confirm. */
export const requestPasswordChangeCode = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.user.id;

        const { user, error } = await validateAndVerifyOldPassword(userId, oldPassword, newPassword);
        if (error) return res.status(error.status).json(error.body);

        const last = passwordOtpLastSend.get(userId) || 0;
        if (Date.now() - last < PASSWORD_OTP_COOLDOWN_MS) {
            const wait = Math.ceil((PASSWORD_OTP_COOLDOWN_MS - (Date.now() - last)) / 1000);
            return res.status(429).json({ message: `Wait ${wait}s before requesting another code` });
        }

        const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
        const hash = hashPasswordOtp(userId, code);
        passwordOtpState.set(userId, { hash, expiresAt: Date.now() + PASSWORD_OTP_TTL_MS, attempts: 0 });
        passwordOtpLastSend.set(userId, Date.now());

        const lang = await getUserLang(userId);
        const sent = await notifyPasswordChangeOtp(user.email, code, lang);
        if (!sent) {
            passwordOtpState.delete(userId);
            return res.status(503).json({ message: "Failed to send verification email" });
        }

        res.json({ message: "Verification code sent" });
    } catch (err) {
        console.error("Error requesting password change code:", err);
        res.status(500).json({ message: "Server error while requesting verification code", error: err.message });
    }
};

/** Step 2 — verify the code from that email, then actually change the password. */
export const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword, code: rawCode } = req.body;
        const userId = req.user.id;

        const { user, error } = await validateAndVerifyOldPassword(userId, oldPassword, newPassword);
        if (error) return res.status(error.status).json(error.body);

        const code = typeof rawCode === "string" ? rawCode.replace(/\D/g, "") : "";
        if (code.length !== 6) {
            return res.status(400).json({ message: "6-digit verification code required" });
        }

        const entry = passwordOtpState.get(userId);
        if (!entry || Date.now() > entry.expiresAt) {
            passwordOtpState.delete(userId);
            return res.status(400).json({ message: "Code expired or missing — request a new one" });
        }
        if (entry.attempts >= PASSWORD_OTP_MAX_ATTEMPTS) {
            passwordOtpState.delete(userId);
            return res.status(429).json({ message: "Too many attempts — request a new code" });
        }
        if (!safeEqualHex(hashPasswordOtp(userId, code), entry.hash)) {
            entry.attempts += 1;
            return res.status(400).json({ message: "Incorrect code" });
        }
        passwordOtpState.delete(userId);

        // Update the password in Supabase Auth (the actual source of truth).
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: newPassword,
        });
        if (updateError) {
            return res.status(500).json({
                message: "Server error while changing password",
                error: updateError.message
            });
        }

        // Notify user by email
        const displayName = user.account_type === "company" ? user.company_name : user.full_name;
        getUserLang(userId).then((lang) =>
          notifyPasswordChanged(user.email, displayName || user.email, lang)
        ).catch((err) => console.error("Password changed email failed:", err.message));

        res.json({
            message: "Password changed successfully"
        });

    } catch (err) {
        console.error("Error changing password:", err);
        res.status(500).json({
            message: "Server error while changing password",
            error: err.message
        });
    }
};

export const sendWelcomeEmail = async (req, res) => {
  try {
    const sent = await sendWelcomeEmailOnce(req.user.id);
    res.json({ sent });
  } catch (err) {
    console.error("sendWelcomeEmail error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteAccount = async (req, res) => {
    try {
        const userId = req.user.id;

        // Delete from custom users table first
        const result = await pool.query(
            'DELETE FROM users WHERE id = $1 RETURNING id, email',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        // Revoke Supabase auth — invalidates all existing JWTs for this user
        await supabaseAdmin.auth.admin.deleteUser(userId);

        res.json({
            message: "Account deleted successfully"
        });

    } catch (err) {
        res.status(500).json({ 
            message: "Server error while deleting account",
            error: err.message 
        });
    }
};