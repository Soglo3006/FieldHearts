import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import { CreateDispute, GetDisputes, UpdateDispute, GetDisputeByBooking, PostDisputeMessage, AdminGetAllDisputes, AdminGetDisputeDetail, AdminUpdateDispute } from "../controllers/disputeController.js";

const router = express.Router();

// Admin (must be before /:id to avoid route conflict)
router.get("/", protect, adminOnly, AdminGetAllDisputes);
router.get("/:id/admin", protect, adminOnly, AdminGetDisputeDetail);
router.put("/:id/admin", protect, adminOnly, AdminUpdateDispute);

// Dispute thread (must be before /:id)
router.get("/booking/:bookingId", protect, GetDisputeByBooking);
router.post("/:disputeId/messages", protect, PostDisputeMessage);

router.post("/", protect, CreateDispute);
router.get("/:id", protect, GetDisputes);
router.put("/:id", protect, UpdateDispute);

export default router;