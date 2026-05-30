import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import {
  createConnectAccount,
  createAccountSession,
  getConnectStatus,
  createCheckoutSession,
  releasePayment,
  refundPayment,
  getPaymentStatus,
  verifyPayment,
} from "../controllers/paymentController.js";

const router = express.Router();

// All other routes require auth
router.post("/connect/create", protect, createConnectAccount);
router.post("/connect/session", protect, createAccountSession);
router.get("/connect/status", protect, getConnectStatus);
router.post("/checkout", protect, createCheckoutSession);
router.post("/verify", protect, verifyPayment);
router.post("/release", protect, releasePayment);
router.post("/refund", protect, adminOnly, refundPayment);
router.get("/status/:bookingId", protect, getPaymentStatus);

export default router;
