export interface WalletTransaction {
  id: string;
  booking_id: string | null;
  type: "credit" | "debit";
  amount: number;
  description: string;
  other_user_name: string | null;
  listing_title: string | null;
  created_at: string;
}

export interface WalletTransactionPart {
  label: string;
  amount: number;
  sortOrder: number;
  category: TransactionCategory;
}

export type TransactionCategory =
  | "deposit"
  | "balance"
  | "full"
  | "received"
  | "cancellation"
  | "deposit_retained"
  | "refund"
  | "payout"
  | "other";

export type TransactionCategoryFilter = TransactionCategory | "all";

export interface DisplayWalletTransaction extends WalletTransaction {
  groupedIds: string[];
  isGrouped: boolean;
  parts: WalletTransactionPart[];
  categories: TransactionCategory[];
}

type TranslateFn = (key: string) => string;

function partSortOrder(description: string): number {
  const d = description.toLowerCase();
  if (d.includes("annulé") || d.includes("cancelled")) return 0;
  if (d.includes("dépôt") || d.includes("deposit")) return 1;
  if (d.includes("solde") || d.includes("balance")) return 2;
  return 3;
}

export function classifyTransactionCategory(description: string): TransactionCategory {
  const d = description.toLowerCase();
  if (d.includes("versement")) return "payout";
  if (d.includes("annulé") || d.includes("cancelled")) return "cancellation";
  if (d.includes("remboursement") || d.includes("refund")) return "refund";
  if (d.includes("payment received") || d.includes("paiement reçu") || d.includes("ajusté après litige")) {
    return "received";
  }
  if (d.includes("payment for service") || d.includes("paiement pour")) return "full";
  if ((d.includes("retenu") || d.includes("retained")) && (d.includes("dépôt") || d.includes("deposit"))) {
    return "deposit_retained";
  }
  if (d.includes("dépôt") || d.includes("deposit")) return "deposit";
  if (d.includes("solde") || d.includes("balance")) return "balance";
  return "other";
}

export function transactionMatchesCategory(
  tx: DisplayWalletTransaction,
  category: TransactionCategoryFilter,
): boolean {
  if (category === "all") return true;
  return tx.categories.includes(category);
}

export function getTransactionPartLabel(description: string, t: TranslateFn): string {
  const d = description.toLowerCase();
  if (d.includes("annulé") || d.includes("cancelled")) return t("wallet.txCancelledDeposit");
  if (d.includes("retenu") || d.includes("retained")) return t("wallet.txDepositRetained");
  if (d.includes("dépôt") || d.includes("deposit")) return t("wallet.txDeposit");
  if (d.includes("solde") || d.includes("balance")) return t("wallet.txBalance");
  if (d.includes("payment received") || d.includes("payment for service")) return t("wallet.txFullPayment");
  return description;
}

export function isDepositOnlyDescription(description: string): boolean {
  const d = description.toLowerCase();
  return (
    (d.includes("dépôt") || d.includes("deposit")) &&
    !d.includes("solde") &&
    !d.includes("balance")
  );
}

export function groupWalletTransactions(
  transactions: WalletTransaction[],
  t: TranslateFn,
): DisplayWalletTransaction[] {
  const standalone: WalletTransaction[] = [];
  const groups = new Map<string, WalletTransaction[]>();

  for (const tx of transactions) {
    if (!tx.booking_id) {
      standalone.push(tx);
      continue;
    }
    const key = `${tx.booking_id}:${tx.type}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(tx);
    else groups.set(key, [tx]);
  }

  const grouped: DisplayWalletTransaction[] = [];

  for (const txs of groups.values()) {
    const sorted = [...txs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const parts = sorted
      .map((tx) => ({
        label: getTransactionPartLabel(tx.description, t),
        amount: Number(tx.amount),
        sortOrder: partSortOrder(tx.description),
        category: classifyTransactionCategory(tx.description),
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const latest = sorted[0];
    grouped.push({
      ...latest,
      amount: sorted.reduce((sum, tx) => sum + Number(tx.amount), 0),
      groupedIds: sorted.map((tx) => tx.id),
      isGrouped: sorted.length > 1,
      parts,
      categories: [...new Set(parts.map((p) => p.category))],
    });
  }

  const singles = standalone.map((tx) => {
    const category = classifyTransactionCategory(tx.description);
    return {
      ...tx,
      groupedIds: [tx.id],
      isGrouped: false,
      parts: [
        {
          label: getTransactionPartLabel(tx.description, t),
          amount: Number(tx.amount),
          sortOrder: partSortOrder(tx.description),
          category,
        },
      ],
      categories: [category],
    };
  });

  return [...grouped, ...singles].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}
