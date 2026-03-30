import test from "node:test";
import assert from "node:assert/strict";
import { summarizeProviderTransactions } from "./reconciliation-summary";

test("summarizeProviderTransactions ignores voided and reversal-linked transactions", () => {
  const summary = summarizeProviderTransactions([
    { type: "FLOAT_PURCHASE", amount: 100000, status: "COMPLETED", relatedTxId: null },
    { type: "DEPOSIT", amount: 50000, status: "COMPLETED", relatedTxId: null },
    { type: "WITHDRAWAL", amount: 30000, status: "COMPLETED", relatedTxId: null },
    { type: "BILL_PAYMENT", amount: 12000, status: "COMPLETED", relatedTxId: null },
    { type: "TRANSFER", amount: 8000, status: "COMPLETED", relatedTxId: null },
    { type: "WITHDRAWAL", amount: 9999, status: "VOIDED", relatedTxId: null },
    { type: "DEPOSIT", amount: 7777, status: "COMPLETED", relatedTxId: "original-tx" },
  ]);

  assert.deepEqual(summary, {
    floatPurchased: 100000,
    depositsServed: 70000,
    withdrawalsServed: 30000,
  });
});

test("summarizeProviderTransactions returns zeros for empty input", () => {
  assert.deepEqual(summarizeProviderTransactions([]), {
    floatPurchased: 0,
    depositsServed: 0,
    withdrawalsServed: 0,
  });
});
