import pool from "../config/db.js";
import { getNextPayoutDate, subtractBusinessDays, processAllPayouts } from "../services/payoutService.js";
import * as XLSX from "xlsx";

const PERIOD_INTERVAL = {
  "2weeks":  "2 weeks",
  "1month":  "1 month",
  "3months": "3 months",
  "6months": "6 months",
  "1year":   "1 year",
};

const MIN_BUSINESS_DAYS = 5;

export const getWallet = async (req, res) => {
  try {
    const userId = req.user.id;

    // Upsert wallet row so the endpoint always returns something
    await pool.query(
      "INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
      [userId]
    );

    const result = await pool.query(
      "SELECT balance, total_spent FROM wallets WHERE user_id = $1",
      [userId]
    );

    const wallet = result.rows[0] ?? { balance: 0, total_spent: 0 };

    // Compute total_earned from credit transactions where user is the worker
    // This always reflects refund adjustments (credit amount is reduced by refundService)
    const earnedResult = await pool.query(
      `SELECT COALESCE(SUM(t.amount), 0) AS total_earned
       FROM transactions t
       JOIN bookings b ON b.id = t.booking_id
       WHERE t.user_id = $1 AND t.type = 'credit' AND b.worker_id = $1`,
      [userId]
    );
    const total_earned = Number(earnedResult.rows[0]?.total_earned ?? 0);

    // ── Payout breakdown ──────────────────────────────────────────────────────
    // Dispute window: 3 calendar days after completion
    // After 3 days with no open dispute → available for payout
    const disputeWindowDays = 3;
    const disputeCutoff = new Date(Date.now() - disputeWindowDays * 24 * 60 * 60 * 1000);

    // Available for payout: no open dispute AND (completed > 3 days ago OR dispute was closed)
    const availableResult = await pool.query(
      `SELECT COALESCE(SUM(t.amount), 0) AS total
       FROM transactions t
       JOIN bookings b ON b.id = t.booking_id
       JOIN payments p ON p.booking_id = t.booking_id AND p.status IN ('paid', 'refunded')
       WHERE t.user_id = $1
         AND t.type = 'credit'
         AND b.status = 'completed'
         AND b.payment_status IN ('paid', 'refunded')
         AND NOT EXISTS (SELECT 1 FROM disputes d WHERE d.booking_id = b.id AND d.status = 'open')
         AND (
           b.completed_at <= $2
           OR EXISTS (SELECT 1 FROM disputes d WHERE d.booking_id = b.id AND d.status IN ('resolved', 'rejected'))
         )`,
      [userId, disputeCutoff.toISOString()]
    );

    // Pending: completed within last 3 days AND no closed dispute AND no open dispute resolved
    const pendingResult = await pool.query(
      `SELECT COALESCE(SUM(t.amount), 0) AS total
       FROM transactions t
       JOIN bookings b ON b.id = t.booking_id
       JOIN payments p ON p.booking_id = t.booking_id AND p.status IN ('paid', 'refunded')
       WHERE t.user_id = $1
         AND t.type = 'credit'
         AND b.status = 'completed'
         AND b.payment_status IN ('paid', 'refunded')
         AND (
           (b.completed_at > $2 AND NOT EXISTS (SELECT 1 FROM disputes d WHERE d.booking_id = b.id))
           OR EXISTS (SELECT 1 FROM disputes d WHERE d.booking_id = b.id AND d.status = 'open')
         )`,
      [userId, disputeCutoff.toISOString()]
    );

    const availableForPayout = Number(availableResult.rows[0]?.total ?? 0);
    const pendingAmount      = Number(pendingResult.rows[0]?.total ?? 0);
    // Credit transactions are already recorded at price * 0.80 (commission already deducted)
    // so net_payout = availableForPayout with no further deduction
    const nextPayoutDate     = getNextPayoutDate();

    res.json({
      ...wallet,
      total_earned,
      available_for_payout: availableForPayout,
      pending_amount: pendingAmount,
      commission_amount: 0,
      net_payout: availableForPayout,
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
         t.id                                                              AS "ID Transaction",
         TO_CHAR(t.created_at AT TIME ZONE 'America/Toronto', 'YYYY-MM-DD') AS "Date",
         TO_CHAR(t.created_at AT TIME ZONE 'America/Toronto', 'HH24:MI:SS') AS "Heure",
         'CA'                                                              AS "Pays",
         COALESCE(uw.province, 'QC')                                      AS "Province",
         t.booking_id                                                      AS "ID Réservation",
         CASE t.type WHEN 'debit' THEN 'Paiement client' ELSE 'Crédit prestataire' END AS "Type",
         COALESCE(p.full_name, p.company_name, 'Unknown')                 AS "Utilisateur",
         t.other_user_name                                                 AS "Autre partie",
         t.listing_title                                                   AS "Titre du service",
         COALESCE(b.custom_price, b.price)                                  AS "Prix de base (CAD)",
         ROUND(COALESCE(b.custom_price, b.price) * 0.05, 2)              AS "Commission acheteur 5% (CAD)",
         COALESCE(b.tax_rate, 0.14975) * 100                              AS "Taux de taxes (%)",
         ROUND(COALESCE(b.custom_price, b.price) * COALESCE(b.tax_rate, 0.14975), 2) AS "Total taxes (CAD)",
         ROUND(COALESCE(b.custom_price, b.price) * (1 + 0.05 + COALESCE(b.tax_rate, 0.14975)), 2) AS "Total facturé au client (CAD)",
         ROUND(COALESCE(b.custom_price, b.price) * 0.20, 2)              AS "Commission plateforme 20% (CAD)",
         ROUND(COALESCE(b.custom_price, b.price) * 0.80, 2)              AS "Versement prestataire 80% (CAD)",
         t.amount                                                          AS "Montant transaction (CAD)",
         COALESCE(b.status, '—')                                          AS "Statut réservation"
       FROM transactions t
       LEFT JOIN users p ON p.id = t.user_id
       LEFT JOIN bookings b ON b.id = t.booking_id
       LEFT JOIN users uw ON uw.id = b.worker_id
       WHERE 1=1 ${dateFilter}
       ORDER BY t.created_at DESC`
    );

    const rows = result.rows;

    // Build workbook
    const ws = XLSX.utils.json_to_sheet(rows);

    // Column widths
    ws["!cols"] = [
      { wch: 38 }, // ID Transaction
      { wch: 12 }, // Date
      { wch: 10 }, // Heure
      { wch: 6  }, // Pays
      { wch: 9  }, // Province
      { wch: 38 }, // ID Réservation
      { wch: 22 }, // Type
      { wch: 24 }, // Utilisateur
      { wch: 24 }, // Autre partie
      { wch: 28 }, // Titre du service
      { wch: 18 }, // Prix de base
      { wch: 24 }, // Commission acheteur
      { wch: 16 }, // Taux de taxes
      { wch: 16 }, // Total taxes
      { wch: 26 }, // Total facturé
      { wch: 28 }, // Commission plateforme
      { wch: 30 }, // Versement prestataire
      { wch: 22 }, // Montant transaction
      { wch: 20 }, // Statut
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const filename = `transactions_${period}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  } catch (err) {
    console.error("exportTransactions error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getPayoutDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: "date required" });

    // Find credit transactions created within ±12 hours of the payout debit date
    const from = new Date(new Date(date).getTime() - 12 * 60 * 60 * 1000);
    const to   = new Date(new Date(date).getTime() + 12 * 60 * 60 * 1000);

    const result = await pool.query(
      `SELECT b.id AS booking_id, s.title, COALESCE(b.custom_price, s.price) AS base_price,
              t.amount AS worker_amount
       FROM transactions t
       JOIN bookings b ON b.id = t.booking_id
       JOIN services s ON s.id = b.service_id
       JOIN payments p ON p.booking_id = b.id AND p.status = 'transferred'
       WHERE t.user_id = $1
         AND t.type = 'credit'
         AND b.worker_id = $1
         AND b.status = 'completed'
         AND b.payment_status = 'transferred'
         AND p.updated_at BETWEEN $2 AND $3`,
      [userId, from.toISOString(), to.toISOString()]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("getPayoutDetails error:", err);
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

// ─── Platform earnings summary (admin only) ───────────────────────────────────
export const getPlatformEarnings = async (req, res) => {
  try {
    const { period } = req.query; // e.g. "7days", "30days", "alltime"

    const intervalMap = {
      "7days":   "7 days",
      "30days":  "30 days",
      "90days":  "90 days",
      "1year":   "1 year",
      "alltime": null,
    };

    const interval = intervalMap[period] ?? null;
    const dateFilter = interval
      ? `AND created_at >= NOW() - INTERVAL '${interval}'`
      : "";

    const totals = await pool.query(
      `SELECT
         type,
         COALESCE(SUM(amount), 0) AS total,
         COUNT(*) AS count
       FROM platform_earnings
       WHERE 1=1 ${dateFilter}
       GROUP BY type`
    );

    const summary = { buyer_commission: 0, worker_commission: 0, total: 0, count: 0 };
    for (const row of totals.rows) {
      const amt = Number(row.total);
      summary[row.type] = amt;
      summary.total += amt;
      summary.count += Number(row.count);
    }
    summary.buyer_commission  = Number(summary.buyer_commission.toFixed(2));
    summary.worker_commission = Number(summary.worker_commission.toFixed(2));
    summary.total             = Number(summary.total.toFixed(2));

    // Recent earnings rows
    const recent = await pool.query(
      `SELECT pe.id, pe.booking_id, pe.type, pe.amount, pe.description, pe.created_at
       FROM platform_earnings pe
       ORDER BY pe.created_at DESC
       LIMIT 100`
    );

    res.json({ summary, entries: recent.rows });
  } catch (err) {
    console.error("getPlatformEarnings error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
