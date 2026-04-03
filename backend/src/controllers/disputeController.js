import pool from "../config/db.js";
import { notifyDisputeCreated, notifyDisputeOutcome } from "../services/emailService.js";
import { createLocalizedNotification, shouldSendEmail } from "../services/notificationService.js";
import { buildRefundSummary, processBookingRefund } from "../services/refundService.js";

export const CreateDispute = async (req, res) => {
    try {
        const { booking_id, description} = req.body;
        const raised_by = req.user.id;
        const status = "open";

        const booking = await pool.query("SELECT * FROM bookings WHERE id = $1", [booking_id]);
        if (booking.rows.length === 0) {
            return res.status(404).json({message: "Booking not found" });
        }
        const b = booking.rows[0];
        if (b.client_id !== req.user.id && b.worker_id !== req.user.id) {
            return res.status(403).json({ message: "You are not part of this booking" });
        }

        // Dispute only allowed within 3 days of completion
        if (b.status === "completed" && b.completed_at) {
            const daysSinceCompletion = (Date.now() - new Date(b.completed_at).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceCompletion > 3) {
                return res.status(400).json({ message: "The 3-day dispute window has expired for this booking." });
            }
        }
        const allowed = ["open", "resolved", "rejected"];
        if (!allowed.includes(status)) {
        return res.status(400).json({ message: "Invalid dispute status" });
        }

        const existing = await pool.query(
        "SELECT * FROM disputes WHERE booking_id = $1",
        [booking_id]
        );

        if (existing.rows.length > 0) {
        return res.status(400).json({ message: "A dispute already exists for this booking" });
        }

        const result = await pool.query(
            `INSERT INTO disputes (booking_id, raised_by, description, status) VALUES ($1, $2, $3, $4) RETURNING *`,
            [booking_id, raised_by, description, status]
        );

        const users = await pool.query(
            `SELECT
                u1.email as client_email,
                CASE WHEN u1.account_type = 'company' THEN u1.company_name ELSE u1.full_name END as client_name,
                u2.email as worker_email,
                CASE WHEN u2.account_type = 'company' THEN u2.company_name ELSE u2.full_name END as worker_name
            FROM users u1, users u2
            WHERE u1.id = $1 AND u2.id = $2`,
            [b.client_id, b.worker_id]
        );

        if (users.rows.length > 0) {
            const { client_email, client_name, worker_email, worker_name } = users.rows[0];
            if (await shouldSendEmail(b.client_id, "complaint"))
              await notifyDisputeCreated(client_email, client_name, booking_id, description);
            if (await shouldSendEmail(b.worker_id, "complaint"))
              await notifyDisputeCreated(worker_email, worker_name, booking_id, description);

            // Notify the other party in-app
            const otherPartyId = raised_by === b.client_id ? b.worker_id : b.client_id;
            const raisedByName = raised_by === b.client_id ? client_name : worker_name;
            createLocalizedNotification({
              userId: otherPartyId,
              type: "dispute",
              link: "/bookings",
              en: { title: "Complaint opened", body: `${raisedByName} opened a complaint about a booking.` },
              fr: { title: "Plainte ouverte", body: `${raisedByName} a ouvert une plainte concernant une réservation.` },
            });
        }

        res.status(201).json(result.rows[0]);
    } catch (err){
        console.error(err);
        res.status(500).json({ message: "Server error while creating dispute" });
    }
}

export const GetDisputes = async (req, res) => {
    try{
        const { id } = req.params;

        const result = await pool.query(
            `SELECT d.* FROM disputes d
             JOIN bookings b ON b.id = d.booking_id
             WHERE d.id = $1 AND (b.client_id = $2 OR b.worker_id = $2)`,
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Dispute not found" });
        }

        res.status(200).json(result.rows[0]);

    } catch(err){
        console.error(err);
        res.status(500).json({ message: "Server error while fetching dispute" });
    }
}

export const UpdateDispute = async (req, res) => {
    return res.status(403).json({ message: "Only admins can update dispute status" });
}

// ─── Dispute thread ───────────────────────────────────────────────────────────

export const GetDisputeByBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const userId = req.user.id;

        // Verify user is part of this booking
        const booking = await pool.query(
            `SELECT client_id, worker_id FROM bookings WHERE id = $1`,
            [bookingId]
        );
        if (booking.rows.length === 0) return res.status(404).json({ message: "Booking not found" });
        const b = booking.rows[0];
        if (b.client_id !== userId && b.worker_id !== userId) {
            return res.status(403).json({ message: "Not authorized" });
        }

        const dispute = await pool.query(
            `SELECT * FROM disputes WHERE booking_id = $1 LIMIT 1`,
            [bookingId]
        );
        if (dispute.rows.length === 0) return res.status(404).json({ message: "No dispute found" });
        const d = dispute.rows[0];

        const messages = await pool.query(
            `SELECT dm.*,
                CASE WHEN u.account_type = 'company' THEN u.company_name ELSE u.full_name END AS sender_name,
                u.account_type AS sender_account_type
             FROM dispute_messages dm
             JOIN users u ON dm.user_id = u.id
             WHERE dm.dispute_id = $1
             ORDER BY dm.created_at ASC`,
            [d.id]
        );

        res.json({ dispute: d, messages: messages.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

export const PostDisputeMessage = async (req, res) => {
    try {
        const { disputeId } = req.params;
        const { content, attachments } = req.body;
        const userId = req.user.id;

        if (!content?.trim() && (!attachments || attachments.length === 0)) {
            return res.status(400).json({ message: "Message cannot be empty" });
        }

        // Verify dispute exists and user is part of it
        const dispute = await pool.query(
            `SELECT d.*, b.client_id, b.worker_id
             FROM disputes d JOIN bookings b ON d.booking_id = b.id
             WHERE d.id = $1`,
            [disputeId]
        );
        if (dispute.rows.length === 0) return res.status(404).json({ message: "Dispute not found" });
        const d = dispute.rows[0];
        if (d.client_id !== userId && d.worker_id !== userId) {
            return res.status(403).json({ message: "Not authorized" });
        }
        if (d.status !== 'open') {
            return res.status(400).json({ message: "This dispute is closed. No more messages can be sent." });
        }

        const result = await pool.query(
            `INSERT INTO dispute_messages (dispute_id, user_id, content, attachments)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [disputeId, userId, content?.trim() || '', JSON.stringify(attachments || [])]
        );

        const msg = result.rows[0];

        // Enrich with sender name
        const user = await pool.query(
            `SELECT CASE WHEN account_type = 'company' THEN company_name ELSE full_name END AS sender_name, account_type AS sender_account_type FROM users WHERE id = $1`,
            [userId]
        );
        res.status(201).json({ ...msg, ...user.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

// ─── Admin endpoints ──────────────────────────────────────────────────────────

export const AdminGetAllDisputes = async (_req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                d.id, d.status, d.description, d.resolution, d.created_at,
                d.booking_id,
                b.service_id,
                b.status AS booking_status,
                b.payment_status,
                s.title AS service_title,
                COALESCE(b.custom_price, s.price) AS service_price,
                CASE WHEN uc.account_type = 'company' THEN uc.company_name ELSE uc.full_name END AS client_name,
                uc.email AS client_email,
                CASE WHEN uw.account_type = 'company' THEN uw.company_name ELSE uw.full_name END AS worker_name,
                uw.email AS worker_email,
                CASE WHEN ur.account_type = 'company' THEN ur.company_name ELSE ur.full_name END AS raised_by_name,
                d.raised_by,
                (SELECT COUNT(*) FROM dispute_messages dm WHERE dm.dispute_id = d.id) AS message_count
             FROM disputes d
             JOIN bookings b ON d.booking_id = b.id
             JOIN services s ON b.service_id = s.id
             JOIN users uc ON b.client_id = uc.id
             JOIN users uw ON b.worker_id = uw.id
             JOIN users ur ON d.raised_by = ur.id
             ORDER BY d.created_at DESC`
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error fetching disputes" });
    }
};

export const AdminGetDisputeDetail = async (req, res) => {
    try {
        const { id } = req.params;

        const disputeResult = await pool.query(
            `SELECT
                d.id, d.status, d.description, d.resolution, d.created_at,
                d.booking_id, d.raised_by,
                b.status AS booking_status,
                b.payment_status,
                b.completed_at,
                b.created_at AS booking_created_at,
                b.service_id,
                COALESCE(b.custom_price, s.price) AS booking_price,
                s.title AS service_title,
                s.price AS service_price,
                s.image_url AS service_image_url,
                CASE WHEN uc.account_type = 'company' THEN uc.company_name ELSE uc.full_name END AS client_name,
                uc.email AS client_email,
                uc.id AS client_id,
                CASE WHEN uw.account_type = 'company' THEN uw.company_name ELSE uw.full_name END AS worker_name,
                uw.email AS worker_email,
                uw.id AS worker_id,
                CASE WHEN ur.account_type = 'company' THEN ur.company_name ELSE ur.full_name END AS raised_by_name,
                p.id AS payment_id,
                p.amount AS payment_amount,
                p.platform_fee,
                p.status AS payment_record_status,
                p.currency,
                p.created_at AS payment_created_at
             FROM disputes d
             JOIN bookings b ON d.booking_id = b.id
             JOIN services s ON b.service_id = s.id
             JOIN users uc ON b.client_id = uc.id
             JOIN users uw ON b.worker_id = uw.id
             JOIN users ur ON d.raised_by = ur.id
             LEFT JOIN LATERAL (
                SELECT *
                FROM payments p2
                WHERE p2.booking_id = b.id
                ORDER BY p2.created_at DESC
                LIMIT 1
             ) p ON true
             WHERE d.id = $1`,
            [id]
        );

        if (disputeResult.rows.length === 0) {
            return res.status(404).json({ message: "Dispute not found" });
        }

        const detail = disputeResult.rows[0];
        const messages = await pool.query(
            `SELECT dm.*, COALESCE(dm.attachments, '[]'::json) AS attachments,
                    CASE WHEN u.account_type = 'company' THEN u.company_name ELSE u.full_name END AS sender_name,
                    u.email AS sender_email
             FROM dispute_messages dm
             JOIN users u ON u.id = dm.user_id
             WHERE dm.dispute_id = $1
             ORDER BY dm.created_at ASC`,
            [id]
        );

        res.status(200).json({
            dispute: {
                id: detail.id,
                status: detail.status,
                description: detail.description,
                resolution: detail.resolution,
                created_at: detail.created_at,
                booking_id: detail.booking_id,
                raised_by: detail.raised_by,
                raised_by_name: detail.raised_by_name,
            },
            booking: {
                id: detail.booking_id,
                service_id: detail.service_id,
                status: detail.booking_status,
                payment_status: detail.payment_status,
                completed_at: detail.completed_at,
                created_at: detail.booking_created_at,
                service_title: detail.service_title,
                service_price: detail.service_price,
                booking_price: detail.booking_price,
                service_image_url: detail.service_image_url,
            },
            parties: {
                client: {
                    id: detail.client_id,
                    name: detail.client_name,
                    email: detail.client_email,
                },
                worker: {
                    id: detail.worker_id,
                    name: detail.worker_name,
                    email: detail.worker_email,
                },
            },
            payment: detail.payment_id ? {
                id: detail.payment_id,
                amount: detail.payment_amount,
                platform_fee: detail.platform_fee,
                status: detail.payment_record_status,
                currency: detail.currency,
                created_at: detail.payment_created_at,
            } : null,
            refund_summary: detail.payment_id && ["paid", "transferred"].includes(detail.payment_record_status)
                ? buildRefundSummary({
                    amount: detail.payment_amount,
                    platform_fee: detail.platform_fee,
                })
                : null,
            messages: messages.rows,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error fetching dispute details" });
    }
};

export const AdminUpdateDispute = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, resolution, refund_client, refund_amount_cents } = req.body;

        const allowed = ["open", "resolved", "rejected"];
        if (!allowed.includes(status)) {
            return res.status(400).json({ message: "Invalid dispute status" });
        }

        const normalizedResolution = resolution?.trim() || null;
        if (status !== "open" && !normalizedResolution) {
            return res.status(400).json({ message: "Resolution notes are required when closing a dispute" });
        }

        const dispute = await pool.query(
            `SELECT d.*, b.client_id, b.worker_id, b.payment_status,
                    CASE WHEN uc.account_type = 'company' THEN uc.company_name ELSE uc.full_name END AS client_name,
                    uc.email AS client_email,
                    CASE WHEN uw.account_type = 'company' THEN uw.company_name ELSE uw.full_name END AS worker_name,
                    uw.email AS worker_email,
                    s.title AS service_title
             FROM disputes d
             JOIN bookings b ON d.booking_id = b.id
             JOIN users uc ON b.client_id = uc.id
             JOIN users uw ON b.worker_id = uw.id
             JOIN services s ON b.service_id = s.id
             WHERE d.id = $1`,
            [id]
        );
        if (dispute.rows.length === 0) {
            return res.status(404).json({ message: "Dispute not found" });
        }

        const currentDispute = dispute.rows[0];

        let refundResult = null;
        if (status === "resolved" && refund_client) {
            refundResult = await processBookingRefund({
                bookingId: currentDispute.booking_id,
                refundAmountCents: refund_amount_cents,
                cancelBooking: false,
            });

            createLocalizedNotification({
                userId: currentDispute.client_id,
                type: "payment",
                link: "/wallet",
                en: { title: "Refund processed", body: `A refund of $${(refundResult.refunded_amount_cents / 100).toFixed(2)} has been processed after your dispute.` },
                fr: { title: "Remboursement effectué", body: `Un remboursement de ${(refundResult.refunded_amount_cents / 100).toFixed(2)} $ a été traité après votre litige.` },
            });
        }

        const result = await pool.query(
            `UPDATE disputes SET status = $1, resolution = $2 WHERE id = $3 RETURNING *`,
            [status, normalizedResolution, id]
        );

        if (status !== "open") {
            const refundedAmount = refundResult ? (refundResult.refunded_amount_cents / 100).toFixed(2) : null;

            createLocalizedNotification({
                userId: currentDispute.client_id,
                type: "dispute",
                link: "/bookings",
                en: { title: status === "resolved" ? "Dispute resolved" : "Dispute rejected", body: normalizedResolution || "A decision has been added to your dispute." },
                fr: { title: status === "resolved" ? "Litige résolu" : "Litige rejeté", body: normalizedResolution || "Une décision a été ajoutée à votre litige." },
            });
            createLocalizedNotification({
                userId: currentDispute.worker_id,
                type: "dispute",
                link: "/bookings",
                en: { title: status === "resolved" ? "Dispute resolved" : "Dispute rejected", body: normalizedResolution || "A decision has been added to your dispute." },
                fr: { title: status === "resolved" ? "Litige résolu" : "Litige rejeté", body: normalizedResolution || "Une décision a été ajoutée à votre litige." },
            });

            if (await shouldSendEmail(currentDispute.client_id, "complaint")) {
                await notifyDisputeOutcome(
                    currentDispute.client_email,
                    currentDispute.client_name,
                    currentDispute.booking_id,
                    status,
                    normalizedResolution,
                    refundedAmount
                );
            }

            if (await shouldSendEmail(currentDispute.worker_id, "complaint")) {
                await notifyDisputeOutcome(
                    currentDispute.worker_email,
                    currentDispute.worker_name,
                    currentDispute.booking_id,
                    status,
                    normalizedResolution,
                    refundedAmount
                );
            }
        }

        res.status(200).json({ ...result.rows[0], refund: refundResult });
    } catch (err) {
        console.error(err);
        if (err.statusCode) {
            return res.status(err.statusCode).json(err.payload);
        }
        res.status(500).json({ message: "Server error updating dispute" });
    }
};