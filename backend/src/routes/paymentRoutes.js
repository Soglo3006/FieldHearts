import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createConnectAccount,
  getConnectStatus,
  createCheckoutSession,
  stripeWebhook,
  releasePayment,
  refundPayment,
  getPaymentStatus,
  verifyPayment,
} from "../controllers/paymentController.js";

const router = express.Router();

// Stripe webhook — must use raw body, no auth middleware
router.post("/webhook", express.raw({ type: "application/json" }), stripeWebhook);

// All other routes require auth
router.post("/connect/create", protect, createConnectAccount);
router.get("/connect/status", protect, getConnectStatus);
router.post("/checkout", protect, createCheckoutSession);
router.post("/verify", protect, verifyPayment);
router.post("/release", protect, releasePayment);
router.post("/refund", protect, refundPayment);
router.get("/status/:bookingId", protect, getPaymentStatus);

export default router;
