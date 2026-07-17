import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import { joinWaitlist, exportWaitlist, checkEmail, requestPasswordChangeCode, changePassword, deleteAccount, sendWelcomeEmail } from "../controllers/authController.js";

const router = express.Router();

// Public — no auth required
router.post("/waitlist", joinWaitlist);
router.get("/waitlist/export", protect, adminOnly, exportWaitlist);
router.post("/check-email", checkEmail);

router.post("/change-password/request-code", protect, requestPasswordChangeCode);
router.put("/change-password", protect, changePassword);
router.delete("/delete-account", protect, deleteAccount);
router.post("/welcome-email", protect, sendWelcomeEmail);

export default router;