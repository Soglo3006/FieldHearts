import pool from "../config/db.js";
import { getNextPayoutDate, subtractBusinessDays, processAllPayouts } from "../services/payoutService.js";

const PERIOD_INTERVAL = {
  "2weeks":  "2 weeks",
  "1month":  "1 month",
  "3months": "3 months",
  "6months": "6 months",
  "1year":   "1 year",
};

const MIN_BUSINESS_DAYS = 5;
const PLATFORM_COMMISSION_RATE = 0.20;

export const getWallet = async (req, res) => {
  try {
    const userId = req.user.id;

    // Upsert wallet row so the endpoint always returns something
    await pool.query(
      "INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
      [userId]
    );

    const result = await pool.query(
      "SELECT balance, total_earned, total_spent FROM wallets WHERE user_id = $1",
      [userId]
    );

    const wallet = result.rows[0] ?? { balance: 0, total_earned: 0, total_spent: 0 };

    // ── Payout breakdown ──────────────────────────────────────────────────────
    const eligibilityCutoff = subtractBusinessDays(new Date(), MIN_BUSINESS_DAYS);

    // Available for payout: unpaid credits older than 5 business days
    const availableResult = await pool.query(
      `SELECT COALESCE(SUM(t.amount), 0) AS total
       FROM transactions t
       JOIN bookings b ON b.id = t.booking_id
       JOIN payments p ON p.booking_id = t.booking_id AND p.status = 'paid'
       WHERE t.user_id = $1
         AND t.type = 'credit'
         AND b.payment_status = 'paid'
         AND t.created_at <= $2`,
      [userId, eligibilityCutoff.toISOString()]
    );

    // Pending: unpaid credits newer than 5 business days
    const pendingResult = await pool.query(
      `SELECT COALESCE(SUM(t.amount), 0) AS total
       FROM transactions t
       JOIN bookings b ON b.id = t.booking_id
       JOIN payments p ON p.booking_id = t.booking_id AND p.status = 'paid'
       WHERE t.user_id = $1
         AND t.type = 'credit'
         AND b.payment_status = 'paid'
         AND t.created_at > $2`,
      [userId, eligibilityCutoff.toISOString()]
    );

    const availableForPayout = Number(availableResult.rows[0]?.total ?? 0);
    const pendingAmount      = Number(pendingResult.rows[0]?.total ?? 0);
    const commissionAmount   = availableForPayout * PLATFORM_COMMISSION_RATE;
    const netPayout          = availableForPayout - commissionAmount;
    const nextPayoutDate     = getNextPayoutDate();

    res.json({
      ...wallet,
      available_for_payout: availableForPayout,
      pending_amount: pendingAmount,
      commission_amount: commissionAmount,
      net_payout: netPayout,
      next_payout_date: nextPayoutDate.toISOString(),
    });
  } catch (err) {
    console.error("getWallet error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const period = req.query.period || "2weeks";
    const params = [userId];
    let dateFilter = "";

    if (period !== "all" && PERIOD_INTERVAL[period]) {
      dateFilter = `AND created_at >= NOW() - INTERVAL '${PERIOD_INTERVAL[period]}'`;
    }

    const result = await pool.query(
      `SELECT id, booking_id, type, amount, description, other_user_name, listing_title, created_at
       FROM transactions
       WHERE user_id = $1 ${dateFilter}
       ORDER BY created_at DESC`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error("getTransactions error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const exportTransactions = async (req, res) => {
  try {
    const period = req.query.period || "all";
    let dateFilter = "";

    if (period !== "all" && PERIOD_INTERVAL[period]) {
      dateFilter = `AND t.created_at >= NOW() - INTERVAL '${PERIOD_INTERVAL[period]}'`;
    }

    const result = await pool.query(
      `SELECT
         t.created_at AS date,
         COALESCE(p.full_name, p.company_name, 'Unknown') AS user_name,
         t.type,
         t.amount,
         t.description,
         t.other_user_name,
         t.listing_title,
         t.booking_id
       FROM transactions t
       LEFT JOIN profiles p ON p.user_id = t.user_id
       WHERE 1=1 ${dateFilter}
       ORDER BY t.created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("exportTransactions error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const triggerPayout = async (req, res) => {
  try {
    await processAllPayouts();
    res.json({ success: true, message: "Payout run completed" });
  } catch (err) {
    console.error("triggerPayout error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
