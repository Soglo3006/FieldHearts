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
      "SELECT balance, total_earned, total_spent FROM wallets WHERE user_id = $1",
      [userId]
    );

    const wallet = result.rows[0] ?? { balance: 0, total_earned: 0, total_spent: 0 };

    // ── Payout breakdown ──────────────────────────────────────────────────────
    const eligibilityCutoff = subtractBusinessDays(new Date(), MIN_BUSINESS_DAYS);

    // Available for payout: completed credits older than 5 business days
    const availableResult = await pool.query(
      `SELECT COALESCE(SUM(t.amount), 0) AS total
       FROM transactions t
       JOIN bookings b ON b.id = t.booking_id
       JOIN payments p ON p.booking_id = t.booking_id AND p.status = 'paid'
       WHERE t.user_id = $1
         AND t.type = 'credit'
         AND b.status = 'completed'
         AND b.payment_status = 'paid'
         AND t.created_at <= $2`,
      [userId, eligibilityCutoff.toISOString()]
    );

    // Pending: completed credits newer than 5 business days
    const pendingResult = await pool.query(
      `SELECT COALESCE(SUM(t.amount), 0) AS total
       FROM transactions t
       JOIN bookings b ON b.id = t.booking_id
       JOIN payments p ON p.booking_id = t.booking_id AND p.status = 'paid'
       WHERE t.user_id = $1
         AND t.type = 'credit'
         AND b.status = 'completed'
         AND b.payment_status = 'paid'
         AND t.created_at > $2`,
      [userId, eligibilityCutoff.toISOString()]
    );

    const availableForPayout = Number(availableResult.rows[0]?.total ?? 0);
    const pendingAmount      = Number(pendingResult.rows[0]?.total ?? 0);
    // Credit transactions are already recorded at price * 0.80 (commission already deducted)
    // so net_payout = availableForPayout with no further deduction
    const nextPayoutDate     = getNextPayoutDate();

    res.json({
      ...wallet,
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
         'QC'                                                              AS "Province",
         t.booking_id                                                      AS "ID Réservation",
         CASE t.type WHEN 'debit' THEN 'Paiement client' ELSE 'Crédit prestataire' END AS "Type",
         COALESCE(p.full_name, p.company_name, 'Unknown')                 AS "Utilisateur",
         t.other_user_name                                                 AS "Autre partie",
         t.listing_title                                                   AS "Titre du service",
         COALESCE(b.custom_price, b.price)                                  AS "Prix de base (CAD)",
         ROUND(COALESCE(b.custom_price, b.price) * 0.05, 2)              AS "Commission acheteur 5% (CAD)",
         ROUND(COALESCE(b.custom_price, b.price) * 0.05, 2)              AS "TPS 5% (CAD)",
         ROUND(COALESCE(b.custom_price, b.price) * 0.09975, 2)           AS "TVQ 9.975% (CAD)",
         ROUND(COALESCE(b.custom_price, b.price) * 0.14975, 2)           AS "Total taxes (CAD)",
         ROUND(COALESCE(b.custom_price, b.price) * 1.19975, 2)           AS "Total facturé au client (CAD)",
         ROUND(COALESCE(b.custom_price, b.price) * 0.20, 2)              AS "Commission plateforme 20% (CAD)",
         ROUND(COALESCE(b.custom_price, b.price) * 0.80, 2)              AS "Versement prestataire 80% (CAD)",
         t.amount                                                          AS "Montant transaction (CAD)",
         COALESCE(b.status, '—')                                          AS "Statut réservation"
       FROM transactions t
       LEFT JOIN profiles p ON p.user_id = t.user_id
       LEFT JOIN bookings b ON b.id = t.booking_id
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
      { wch: 12 }, // TPS
      { wch: 16 }, // TVQ
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

export const triggerPayout = async (req, res) => {
  try {
    await processAllPayouts();
    res.json({ success: true, message: "Payout run completed" });
  } catch (err) {
    console.error("triggerPayout error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
