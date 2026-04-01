import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { completeProfile, GetMyProfile, UpdateMyProfile, getUserProfile, getSettings, updateSettings, searchProfiles } from "../controllers/profileController.js";

const router = express.Router();

router.get("/me", protect, GetMyProfile);
router.put("/me", protect, UpdateMyProfile);
router.put("/complete", protect, completeProfile);
router.get("/settings", protect, getSettings);
router.put("/settings", protect, updateSettings);
router.get("/search", protect, searchProfiles);
router.get("/:id", getUserProfile);

export default router;