import { getLedgerReconciliation } from "../services/ledgerService.js";

export const getLedgerReconciliationReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const report = await getLedgerReconciliation({ from, to });
    res.json(report);
  } catch (err) {
    console.error("[Ledger] reconciliation error:", err);
    res.status(500).json({ message: "Failed to generate ledger reconciliation" });
  }
};
