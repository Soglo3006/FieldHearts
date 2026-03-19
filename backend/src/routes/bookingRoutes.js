import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createBooking, getMyBookings, updateBookingStatus,
  getReceivedBookings, markCompleted,
  customizeBooking, requestCancellation, declineCancellation,
  getBookingById,
} from "../controllers/bookingController.js";

const router = express.Router();

router.post("/", protect, createBooking);
router.get("/my-bookings", protect, getMyBookings);
router.get("/received-bookings", protect, getReceivedBookings);
router.get("/:id", protect, getBookingById);
router.put("/:id/status", protect, updateBookingStatus);
router.post("/:id/complete", protect, markCompleted);
router.patch("/:id/customize", protect, customizeBooking);
router.post("/:id/cancel-request", protect, requestCancellation);
router.post("/:id/cancel-decline", protect, declineCancellation);

export default router;