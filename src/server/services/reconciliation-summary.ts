export type ProviderMovementTransaction = {
  type: string;
  amount: number | { toString(): string };
  status: string;
  relatedTxId: string | null;
};

export function summarizeProviderTransactions(
  transactions: ProviderMovementTransaction[]
) {
  const activeProviderTransactions = transactions.filter(
    (tx) => tx.status !== "VOIDED" && !tx.relatedTxId
  );

  const floatPurchased = activeProviderTransactions
    .filter((tx) => tx.type === "FLOAT_PURCHASE")
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const depositsServed = activeProviderTransactions
    .filter((tx) => ["DEPOSIT", "BILL_PAYMENT", "MERCHANT_PAYMENT", "TRANSFER"].includes(tx.type))
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const withdrawalsServed = activeProviderTransactions
    .filter((tx) => tx.type === "WITHDRAWAL")
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  return {
    floatPurchased,
    depositsServed,
    withdrawalsServed,
  };
}
