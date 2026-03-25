import { db } from "@server/lib/db";
import { type ProviderCode } from "@prisma/client";

export interface TillBalance {
  tillId: string;
  tillName: string;
  tillType: string;
  balance: number;
  providerId?: string;
  providerName?: string;
}

export interface BranchBalances {
  branchId: string;
  cashBalance: number;
  floatBalances: {
    providerId: string;
    providerName: string;
    providerCode: ProviderCode;
    balance: number;
    lowThreshold: number;
    isLow: boolean;
  }[];
  updatedAt: Date;
}

/**
 * Get current cash balance for a till
 * Derived from the most recent ledger entry (running balance)
 */
export async function getTillCashBalance(tillId: string): Promise<number> {
  const lastEntry = await db.cashLedgerEntry.findFirst({
    where: { tillId },
    orderBy: { entryDate: "desc" },
  });
  return lastEntry ? Number(lastEntry.balanceAfter) : 0;
}

/**
 * Get current float balance for a specific till + provider
 */
export async function getTillFloatBalance(
  tillId: string,
  providerId: string
): Promise<number> {
  const lastEntry = await db.floatLedgerEntry.findFirst({
    where: { tillId, providerId },
    orderBy: { entryDate: "desc" },
  });
  return lastEntry ? Number(lastEntry.balanceAfter) : 0;
}

/**
 * Get all balances for a branch
 */
export async function getBranchBalances(
  organizationId: string,
  branchId: string
): Promise<BranchBalances> {
  const [cashTills, floatTills] = await Promise.all([
    db.till.findMany({
      where: { organizationId, branchId, type: "CASH_BOX", status: "ACTIVE" },
    }),
    db.till.findMany({
      where: {
        organizationId,
        branchId,
        type: "FLOAT_ACCOUNT",
        status: "ACTIVE",
      },
      include: { provider: true },
    }),
  ]);

  // Sum all cash tills
  let cashBalance = 0;
  for (const till of cashTills) {
    cashBalance += await getTillCashBalance(till.id);
  }

  // Get each float till balance
  const floatBalances = await Promise.all(
    floatTills
      .filter((t: { provider: { name: string; code: ProviderCode; lowFloatThreshold: unknown } | null }) => t.provider)
      .map(async (till: { id: string; providerId: string | null; provider: { name: string; code: ProviderCode; lowFloatThreshold: unknown } | null }) => {
        const balance = await getTillFloatBalance(
          till.id,
          till.providerId!
        );
        return {
          providerId: till.providerId!,
          providerName: till.provider!.name,
          providerCode: till.provider!.code,
          balance,
          lowThreshold: Number(till.provider!.lowFloatThreshold),
          isLow: balance < Number(till.provider!.lowFloatThreshold),
        };
      })
  );

  return {
    branchId,
    cashBalance,
    floatBalances,
    updatedAt: new Date(),
  };
}

/**
 * Get balances for all branches in an organization
 */
export async function getOrganizationBalances(organizationId: string) {
  const branches = await db.branch.findMany({
    where: { organizationId, status: "ACTIVE" },
    select: { id: true, name: true },
  });

  const balances = await Promise.all(
    branches.map(async (branch: { id: string; name: string }) => ({
      branch,
      ...(await getBranchBalances(organizationId, branch.id)),
    }))
  );

  return balances;
}

/**
 * Create a cash ledger entry and update running balance
 */
export async function appendCashLedgerEntry(
  params: {
    organizationId: string;
    branchId: string;
    tillId: string;
    transactionId?: string;
    entryType: "DEBIT" | "CREDIT";
    amount: number;
    description?: string;
    entryDate?: Date;
  },
  tx?: Parameters<Parameters<typeof db.$transaction>[0]>[0]
) {
  // Get current balance
  const lastEntry = await (tx
    ? tx.cashLedgerEntry.findFirst
    : db.cashLedgerEntry.findFirst)({
    where: { tillId: params.tillId },
    orderBy: { entryDate: "desc" },
  } as Parameters<typeof db.cashLedgerEntry.findFirst>[0]);

  const currentBalance = lastEntry ? Number(lastEntry.balanceAfter) : 0;
  const newBalance =
    params.entryType === "CREDIT"
      ? currentBalance + params.amount
      : currentBalance - params.amount;

  if (newBalance < 0) {
    throw new Error("Insufficient cash balance");
  }

  return (tx ? tx.cashLedgerEntry.create : db.cashLedgerEntry.create)({
    data: {
      organizationId: params.organizationId,
      branchId: params.branchId,
      tillId: params.tillId,
      transactionId: params.transactionId,
      entryType: params.entryType,
      amount: params.amount,
      balanceAfter: newBalance,
      description: params.description,
      entryDate: params.entryDate ?? new Date(),
    },
  } as Parameters<typeof db.cashLedgerEntry.create>[0]);
}

/**
 * Create a float ledger entry and update running balance
 */
export async function appendFloatLedgerEntry(
  params: {
    organizationId: string;
    branchId: string;
    tillId: string;
    providerId: string;
    transactionId?: string;
    entryType: "DEBIT" | "CREDIT";
    amount: number;
    description?: string;
    entryDate?: Date;
  },
  tx?: Parameters<Parameters<typeof db.$transaction>[0]>[0]
) {
  const lastEntry = await (tx
    ? tx.floatLedgerEntry.findFirst
    : db.floatLedgerEntry.findFirst)({
    where: { tillId: params.tillId, providerId: params.providerId },
    orderBy: { entryDate: "desc" },
  } as Parameters<typeof db.floatLedgerEntry.findFirst>[0]);

  const currentBalance = lastEntry ? Number(lastEntry.balanceAfter) : 0;
  const newBalance =
    params.entryType === "CREDIT"
      ? currentBalance + params.amount
      : currentBalance - params.amount;

  if (newBalance < 0) {
    throw new Error("Insufficient float balance");
  }

  return (tx ? tx.floatLedgerEntry.create : db.floatLedgerEntry.create)({
    data: {
      organizationId: params.organizationId,
      branchId: params.branchId,
      tillId: params.tillId,
      providerId: params.providerId,
      transactionId: params.transactionId,
      entryType: params.entryType,
      amount: params.amount,
      balanceAfter: newBalance,
      description: params.description,
      entryDate: params.entryDate ?? new Date(),
    },
  } as Parameters<typeof db.floatLedgerEntry.create>[0]);
}
