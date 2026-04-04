import express from "express";
import multer from "multer";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import { CreateDispute, GetDisputes, UpdateDispute, GetDisputeByBooking, PostDisputeMessage, UploadDisputeAttachments, AdminGetAllDisputes, AdminGetDisputeDetail, AdminUpdateDispute } from "../controllers/disputeController.js";

const router = express.Router();
const disputeAttachmentUpload = multer({
	storage: multer.memoryStorage(),
	limits: {
		files: 4,
		fileSize: 8 * 1024 * 1024,
	},
	fileFilter: (_req, file, callback) => {
		if (file.mimetype?.startsWith("image/")) {
			return callback(null, true);
		}
		return callback(new Error("Only image files are allowed"));
	},
});

function handleDisputeAttachmentUpload(req, res, next) {
	disputeAttachmentUpload.array("files", 4)(req, res, (err) => {
		if (!err) {
			return next();
		}

		if (err instanceof multer.MulterError) {
			if (err.code === "LIMIT_FILE_SIZE") {
				return res.status(400).json({ message: "Each file must be 8 MB or less" });
			}
			if (err.code === "LIMIT_FILE_COUNT") {
				return res.status(400).json({ message: "You can upload up to 4 images" });
			}
		}

		return res.status(400).json({ message: err.message || "Invalid file upload" });
	});
}

// Admin (must be before /:id to avoid route conflict)
router.get("/", protect, adminOnly, AdminGetAllDisputes);
router.get("/:id/admin", protect, adminOnly, AdminGetDisputeDetail);
router.put("/:id/admin", protect, adminOnly, AdminUpdateDispute);

// Dispute thread (must be before /:id)
router.get("/booking/:bookingId", protect, GetDisputeByBooking);
router.post("/:disputeId/attachments", protect, handleDisputeAttachmentUpload, UploadDisputeAttachments);
router.post("/:disputeId/messages", protect, PostDisputeMessage);

router.post("/", protect, CreateDispute);
router.get("/:id", protect, GetDisputes);
router.put("/:id", protect, UpdateDispute);

export default router;
