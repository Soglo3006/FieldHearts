import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  listWorkSessions,
  createWorkSession,
  submitWorkSessionHours,
  respondWorkSessionAsClient,
  respondWorkSessionAsWorker,
  deleteWorkSession,
} from "../controllers/workSessionController.js";

const router = express.Router();

router.get("/", protect, listWorkSessions);
router.post("/", protect, createWorkSession);
router.post("/:id/submit", protect, submitWorkSessionHours);
router.post("/:id/client-respond", protect, respondWorkSessionAsClient);
router.post("/:id/worker-respond", protect, respondWorkSessionAsWorker);
router.delete("/:id", protect, deleteWorkSession);

export default router;
