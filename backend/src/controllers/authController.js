import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import { notifyPasswordChanged, notifyWaitlistConfirmation } from "../services/emailService.js";

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

export const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.user.id;

        // Validation
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ 
                message: "Old password and new password are required" 
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ 
                message: "New password must be at least 8 characters" 
            });
        }

        if (oldPassword === newPassword) {
            return res.status(400).json({ 
                message: "New password must be different from current password" 
            });
        }

        // Récupérer l'utilisateur avec le mot de passe
        const result = await pool.query(
            'SELECT * FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const user = result.rows[0];

        // Vérifier l'ancien mot de passe
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ 
                message: "Current password is incorrect" 
            });
        }

        // Hasher le nouveau mot de passe
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Mettre à jour le mot de passe
        await pool.query(
            'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
            [hashedPassword, userId]
        );

        // Notify user by email
        const displayName = user.account_type === "company" ? user.company_name : user.full_name;
        notifyPasswordChanged(user.email, displayName || user.email)
          .catch((err) => console.error("Password changed email failed:", err.message));

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

export const deleteAccount = async (req, res) => {
    try {
        const userId = req.user.id;

        // Supprimer l'utilisateur de la base de données
        const result = await pool.query(
            'DELETE FROM users WHERE id = $1 RETURNING id, email',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }


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