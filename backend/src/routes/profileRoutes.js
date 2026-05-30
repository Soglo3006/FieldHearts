import express from "express";
import { protect, adminOnly, optionalProtect } from "../middleware/authMiddleware.js";
import { initializeAccount, completeProfile, GetMyProfile, UpdateMyProfile, getUserProfile, getSettings, updateSettings, searchProfiles, suspendUser, getAllUsers } from "../controllers/profileController.js";
import pool from "../config/db.js";

const router = express.Router();

// PUT /api/profiles/presence — heartbeat via backend pool (zero Supabase REST egress)
router.put("/presence", protect, async (req, res) => {
  try {
    const { is_online, active_chat_id } = req.body;
    await pool.query(
      `INSERT INTO user_presence (user_id, is_online, last_seen, active_chat_id)
       VALUES ($1, $2, NOW(), $3)
       ON CONFLICT (user_id) DO UPDATE
         SET is_online = $2, last_seen = NOW(), active_chat_id = $3`,
      [req.user.id, is_online !== false, active_chat_id ?? null]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("presence error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/me", protect, GetMyProfile);
router.put("/me", protect, UpdateMyProfile);
router.put("/initialize", protect, initializeAccount);
router.put("/complete", protect, completeProfile);
router.get("/settings", protect, getSettings);
router.put("/settings", protect, updateSettings);
router.get("/search", protect, searchProfiles);
router.get("/admin/all", protect, adminOnly, getAllUsers);
router.put("/:id/suspend", protect, adminOnly, suspendUser);
router.get("/:id", optionalProtect, getUserProfile);

export default router;