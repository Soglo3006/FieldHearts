import pool from "../config/db.js";
import stripe from "../config/stripe.js";
import { notifyDisputeCreated } from "../services/emailService.js";
import { createLocalizedNotification, shouldSendEmail } from "../services/notificationService.js";

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
    try {
        const { id } = req.params;
        const { status } = req.body;

        const allowed = ["open", "resolved", "rejected"];
        if (!allowed.includes(status)) {
            return res.status(400).json({ message: "Invalid dispute status" });
        }

        const dispute = await pool.query(
            `SELECT d.*, b.client_id, b.worker_id
             FROM disputes d
             JOIN bookings b ON d.booking_id = b.id
             WHERE d.id = $1`,
            [id]
        );

        if (dispute.rows.length === 0) {
            return res.status(404).json({ message: "Dispute not found" });
        }

        const d = dispute.rows[0];

        if (d.client_id !== req.user.id && d.worker_id !== req.user.id) {
            return res.status(403).json({ message: "You are not authorized to update this dispute" });
        }

        const result = await pool.query(
            `UPDATE disputes SET status = $1 WHERE id = $2 RETURNING *`,
            [status, id]
        );

        res.status(200).json(result.rows[0]);

    } catch(err){
        console.error(err);
        res.status(500).json({ message: "Server error while updating dispute" });
    }
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
                s.title AS service_title,
                s.price AS service_price,
                CASE WHEN uc.account_type = 'company' THEN uc.company_name ELSE uc.full_name END AS client_name,
                uc.email AS client_email,
                CASE WHEN uw.account_type = 'company' THEN uw.company_name ELSE uw.full_name END AS worker_name,
                uw.email AS worker_email,
                CASE WHEN ur.account_type = 'company' THEN ur.company_name ELSE ur.full_name END AS raised_by_name,
                d.raised_by
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

export const AdminUpdateDispute = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, resolution, refund_client } = req.body;

        const allowed = ["open", "resolved", "rejected"];
        if (!allowed.includes(status)) {
            return res.status(400).json({ message: "Invalid dispute status" });
        }

        const dispute = await pool.query(
            `SELECT d.*, b.client_id, b.worker_id FROM disputes d JOIN bookings b ON d.booking_id = b.id WHERE d.id = $1`,
            [id]
        );
        if (dispute.rows.length === 0) {
            return res.status(404).json({ message: "Dispute not found" });
        }

        // Trigger refund if admin chose to refund the client
        if (status === "resolved" && refund_client) {
            const booking_id = dispute.rows[0].booking_id;
            const client_id  = dispute.rows[0].client_id;
            const worker_id  = dispute.rows[0].worker_id;

            const payment = await pool.query(
                "SELECT * FROM payments WHERE booking_id = $1 AND status IN ('paid', 'transferred') ORDER BY created_at DESC LIMIT 1",
                [booking_id]
            );

            if (payment.rows.length === 0) {
                return res.status(400).json({ message: "No eligible payment found for this booking — refund cannot be processed." });
            }

            const p = payment.rows[0];

            if (!p.stripe_payment_intent_id) {
                return res.status(400).json({ message: "No Stripe payment intent found — refund cannot be processed." });
            }

            // If funds were already transferred to worker, reverse the transfer first
            if (p.stripe_transfer_id) {
                try {
                    await stripe.transfers.createReversal(p.stripe_transfer_id);
                } catch (_) { /* transfer may already be reversed */ }
            }
            await stripe.refunds.create({ payment_intent: p.stripe_payment_intent_id });

            await pool.query(
                "UPDATE payments SET status = 'refunded', updated_at = NOW() WHERE id = $1",
                [p.id]
            );
            await pool.query(
                "UPDATE bookings SET payment_status = 'refunded' WHERE id = $1",
                [booking_id]
            );

            // Decrement client's total_spent in wallet
            const debitTx = await pool.query(
                "SELECT amount FROM transactions WHERE booking_id = $1 AND type = 'debit' LIMIT 1",
                [booking_id]
            );
            if (debitTx.rows.length > 0) {
                await pool.query(
                    "UPDATE wallets SET total_spent = GREATEST(0, total_spent - $1) WHERE user_id = $2",
                    [debitTx.rows[0].amount, client_id]
                );
            }

            // Decrement worker's balance and total_earned in wallet
            const creditTx = await pool.query(
                "SELECT amount FROM transactions WHERE booking_id = $1 AND type = 'credit' LIMIT 1",
                [booking_id]
            );
            if (creditTx.rows.length > 0) {
                await pool.query(
                    `UPDATE wallets
                     SET balance = GREATEST(0, balance - $1),
                         total_earned = GREATEST(0, total_earned - $1)
                     WHERE user_id = $2`,
                    [creditTx.rows[0].amount, worker_id]
                );
            }

            // Notify client
            createLocalizedNotification({
                userId: client_id,
                type: "payment",
                link: "/wallet",
                en: { title: "Refund processed", body: "Your payment has been refunded following the resolution of your dispute." },
                fr: { title: "Remboursement effectué", body: "Votre paiement a été remboursé suite à la résolution de votre plainte." },
            });
        }

        const result = await pool.query(
            `UPDATE disputes SET status = $1, resolution = $2 WHERE id = $3 RETURNING *`,
            [status, resolution || null, id]
        );

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error updating dispute" });
    }
};