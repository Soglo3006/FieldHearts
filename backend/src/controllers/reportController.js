import pool from "../config/db.js";
import { sanitizeText } from "../utils/validate.js";

export const reportListing = async (req, res) => {
  try {
    const { listing_id, reported_user_id } = req.body;
    const reason      = sanitizeText(req.body.reason);
    const description = sanitizeText(req.body.description);
    const reporter_id = req.user.id;

    if (!listing_id || !reported_user_id || !reason || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await pool.query(
      `INSERT INTO listing_reports (reporter_id, listing_id, reported_user_id, reason, description, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [reporter_id, listing_id, reported_user_id, reason, description]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Error submitting listing report:', err);
    res.status(500).json({ error: 'Failed to submit report' });
  }
};