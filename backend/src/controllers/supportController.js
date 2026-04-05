import pool from "../config/db.js";
import { sanitizeText } from "../utils/validate.js";

async function ensureSupportTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL,
      subject TEXT,
      category TEXT,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

export const createSupportTicket = async (req, res) => {
  try {
    await ensureSupportTable();
    const subject     = sanitizeText(req.body.subject);
    const category    = sanitizeText(req.body.category);
    const description = sanitizeText(req.body.description);
    if (!description || description.trim().length === 0) {
      return res.status(400).json({ message: "Description is required" });
    }

    const result = await pool.query(
      `INSERT INTO support_tickets (user_id, subject, category, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.id, subject || null, category || null, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while creating support ticket" });
  }
};

export const listSupportTickets = async (req, res) => {
  try {
    await ensureSupportTable();
    const result = await pool.query(
      `SELECT st.*, u.email AS user_email
       FROM support_tickets st
       LEFT JOIN users u ON st.user_id = u.id
       ORDER BY st.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while fetching support tickets" });
  }
};

export const updateSupportStatus = async (req, res) => {
  try {
    await ensureSupportTable();
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ["open", "in_progress", "closed"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const result = await pool.query(
      `UPDATE support_tickets SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while updating ticket" });
  }
};
