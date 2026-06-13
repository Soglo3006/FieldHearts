import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  listCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getCalendarFeedToken,
  getCalendarFeed,
  getGoogleCalendarStatus,
  startGoogleCalendarAuth,
  googleCalendarCallback,
  disconnectGoogle,
  syncGoogleCalendar,
} from "../controllers/calendarController.js";

const router = express.Router();

router.get("/google/callback", googleCalendarCallback);
router.get("/feed/:token", getCalendarFeed);
router.get("/feed-token", protect, getCalendarFeedToken);
router.get("/google/status", protect, getGoogleCalendarStatus);
router.get("/google/connect", protect, startGoogleCalendarAuth);
router.delete("/google/disconnect", protect, disconnectGoogle);
router.post("/google/sync", protect, syncGoogleCalendar);
router.get("/events", protect, listCalendarEvents);
router.post("/events", protect, createCalendarEvent);
router.patch("/events/:id", protect, updateCalendarEvent);
router.delete("/events/:id", protect, deleteCalendarEvent);

export default router;
