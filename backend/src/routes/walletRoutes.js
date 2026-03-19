import express from "express";
import { getWallet, getTransactions, exportTransactions, triggerPayout } from "../controllers/walletController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getWallet);
router.get("/transactions", protect, getTransactions);
router.get("/export", protect, adminOnly, exportTransactions);
router.post("/payout/trigger", protect, adminOnly, triggerPayout);

export default router;
