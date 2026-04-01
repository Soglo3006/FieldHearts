import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getBillingAddresses,
  createBillingAddress,
  updateBillingAddress,
  deleteBillingAddress,
  setDefaultBillingAddress,
} from "../controllers/billingAddressController.js";

const router = express.Router();

router.get("/", protect, getBillingAddresses);
router.post("/", protect, createBillingAddress);
router.put("/:id", protect, updateBillingAddress);
router.delete("/:id", protect, deleteBillingAddress);
router.post("/:id/default", protect, setDefaultBillingAddress);

export default router;
