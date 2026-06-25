import express from "express";
import { getWallet, getTransactions, exportTransactions, triggerPayout, getPlatformEarnings, getPayoutDetails, getPendingDisputeDetails, getApprovedPayoutDetails, getEarnedDetails, getSpentDetails } from "../controllers/walletController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getWallet);
router.get("/pending-details", protect, getPendingDisputeDetails);
router.get("/approved-details", protect, getApprovedPayoutDetails);
router.get("/earned-details", protect, getEarnedDetails);
router.get("/spent-details", protect, getSpentDetails);
router.get("/transactions", protect, getTransactions);
router.get("/payout-details", protect, getPayoutDetails);
router.get("/export", protect, adminOnly, exportTransactions);
router.post("/payout/trigger", protect, adminOnly, triggerPayout);
router.get("/platform-earnings", protect, adminOnly, getPlatformEarnings);

export default router;
