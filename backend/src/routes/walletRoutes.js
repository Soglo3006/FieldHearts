import express from "express";
import { getWallet, getTransactions, exportTransactions, triggerPayout, getPlatformEarnings, getPayoutDetails, getPendingDisputeDetails } from "../controllers/walletController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getWallet);
router.get("/pending-details", protect, getPendingDisputeDetails);
router.get("/transactions", protect, getTransactions);
router.get("/payout-details", protect, getPayoutDetails);
router.get("/export", protect, adminOnly, exportTransactions);
router.post("/payout/trigger", protect, adminOnly, triggerPayout);
router.get("/platform-earnings", protect, adminOnly, getPlatformEarnings);

export default router;
