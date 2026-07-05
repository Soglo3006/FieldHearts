import express from "express";
import { protect, optionalProtect } from "../middleware/authMiddleware.js";
import { createService, getAllServices, deleteService, getMyServices, updateService, getServiceById, getUserServices, getCategoryCounts, suggestServiceLocations } from "../controllers/serviceController.js";

const router = express.Router();

router.post("/", protect, createService);
router.get("/", getAllServices);
router.get("/location-suggestions", suggestServiceLocations);
router.get("/category-counts", getCategoryCounts);
router.get("/my-services", protect, getMyServices);
router.get("/user/:userId", optionalProtect, getUserServices);
router.get("/:id", optionalProtect, getServiceById);
router.put("/:id", protect, updateService);
router.delete("/:id", protect, deleteService);

export default router;
