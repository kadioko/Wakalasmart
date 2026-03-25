import { db } from "@server/lib/db";
import { TransactionType, Prisma } from "@prisma/client";
import { appendCashLedgerEntry, appendFloatLedgerEntry } from "./balance.service";
import { createAuditLog } from "./audit.service";
import { checkAndCreateAlerts, checkDuplicateReference } from "./alert.service";
import type { CreateTransactionInput } from "@shared/types";

/**
 * Determines ledger impact of each transaction type.
 * Returns: cash effect (DEBIT = decrease, CREDIT = increase), float effect
 */
function getLedgerImpact(type: TransactionType): {
  cashEffect: "CREDIT" | "DEBIT" | null;
  floatEffect: "CREDIT" | "DEBIT" | null;
} {
  const impacts: Record<
    TransactionType,
    { cashEffect: "CREDIT" | "DEBIT" | null; floatEffect: "CREDIT" | "DEBIT" | null }
  > = {
    DEPOSIT: { cashEffect: "CREDIT", floatEffect: "DEBIT" }, // receive cash, give float
    WITHDRAWAL: { cashEffect: "DEBIT", floatEffect: "CREDIT" }, // give cash, receive float
    FLOAT_PURCHASE: { cashEffect: "DEBIT", floatEffect: "CREDIT" }, // pay cash to get float
    AIRTIME_SALE: { cashEffect: "CREDIT", floatEffect: null }, // receive cash
    BILL_PAYMENT: { cashEffect: "CREDIT", floatEffect: "DEBIT" }, // receive cash, pay float
    TRANSFER: { cashEffect: null, floatEffect: "DEBIT" }, // send float
    MERCHANT_PAYMENT: { cashEffect: "CREDIT", floatEffect: "DEBIT" },
    REVERSAL: { cashEffect: "DEBIT", floatEffect: "CREDIT" }, // reverse a deposit
    ADJUSTMENT: { cashEffect: null, floatEffect: null }, // manual, no auto ledger
    EXPENSE: { cashEffect: "DEBIT", floatEffect: null }, // pay cash
    OWNER_WITHDRAWAL: { cashEffect: "DEBIT", floatEffect: null },
    OWNER_INJECTION: { cashEffect: "CREDIT", floatEffect: null },
    BANK_DEPOSIT: { cashEffect: "DEBIT", floatEffect: null }, // cash to bank
    BANK_WITHDRAWAL: { cashEffect: "CREDIT", floatEffect: null }, // cash from bank
    INTER_BRANCH_TRANSFER: { cashEffect: "DEBIT", floatEffect: null },
  };
  return impacts[type];
}

function getOppositeEntryType(entryType: "CREDIT" | "DEBIT"): "CREDIT" | "DEBIT" {
  return entryType === "CREDIT" ? "DEBIT" : "CREDIT";
}

async function appendDeferredLedgerEntries(
  transaction: {
    id: string;
    organizationId: string;
    branchId: string;
    tillId: string;
    providerId: string | null;
    type: TransactionType;
    amount: Prisma.Decimal | number;
    reference: string | null;
    transactedAt: Date;
  },
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]
) {
  const till = await tx.till.findFirst({
    where: { id: transaction.tillId, organizationId: transaction.organizationId },
  });

  if (!till) {
    throw new Error("Till not found");
  }

  const provider = transaction.providerId
    ? await tx.provider.findFirst({
        where: { id: transaction.providerId, organizationId: transaction.organizationId },
      })
    : null;

  const impact = getLedgerImpact(transaction.type);
  const amount = Number(transaction.amount);

  if (impact.cashEffect && till.type === "CASH_BOX") {
    await appendCashLedgerEntry(
      {
        organizationId: transaction.organizationId,
        branchId: transaction.branchId,
        tillId: transaction.tillId,
        transactionId: transaction.id,
        entryType: impact.cashEffect,
        amount,
        description: `${transaction.type} - ${transaction.reference || transaction.id}`,
        entryDate: transaction.transactedAt,
      },
      tx as unknown as Parameters<typeof appendCashLedgerEntry>[1]
    );
  }

  if (impact.floatEffect && provider && till.type === "FLOAT_ACCOUNT") {
    await appendFloatLedgerEntry(
      {
        organizationId: transaction.organizationId,
        branchId: transaction.branchId,
        tillId: transaction.tillId,
        providerId: provider.id,
        transactionId: transaction.id,
        entryType: impact.floatEffect,
        amount,
        description: `${transaction.type} - ${transaction.reference || transaction.id}`,
        entryDate: transaction.transactedAt,
      },
      tx as unknown as Parameters<typeof appendFloatLedgerEntry>[1]
    );
  }
}

export async function createTransaction(
  input: CreateTransactionInput,
  userId: string,
  organizationId: string,
  ipAddress?: string
) {
  // 1. Check for open shift if required
  const settings = await db.organizationSettings.findUnique({
    where: { organizationId },
  });

  if (settings?.shiftsMandatory) {
    const openShift = await db.shift.findFirst({
      where: {
        organizationId,
        branchId: input.branchId,
        status: "OPEN",
        openedById: userId,
      },
    });
    if (!openShift) {
      throw new Error("No open shift. Please open a shift before recording transactions.");
    }
  }

  // 2. Check duplicate reference
  if (input.reference) {
    const isDuplicate = await checkDuplicateReference(organizationId, input.reference);
    if (isDuplicate && settings?.duplicateReferenceMode === "BLOCK") {
      throw new Error(`Reference number "${input.reference}" already exists.`);
    }
  }

  // 3. Get active shift
  const activeShift = await db.shift.findFirst({
    where: {
      organizationId,
      branchId: input.branchId,
      status: "OPEN",
    },
    orderBy: { openedAt: "desc" },
  });

  // 4. Get till and provider
  const till = await db.till.findFirst({
    where: { id: input.tillId, organizationId },
  });
  if (!till) throw new Error("Till not found");

  const provider = input.providerId
    ? await db.provider.findFirst({
        where: { id: input.providerId, organizationId },
      })
    : null;

  // 5. Determine if approval required
  const requiresApproval =
    input.type === "REVERSAL" && settings?.requireApprovalForReversals
      ? true
      : input.type === "ADJUSTMENT" && settings?.requireApprovalForAdjustments
        ? true
        : false;

  // 6. Create transaction + ledger entries in a single DB transaction
  const result = await db.$transaction(async (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]) => {
    const transaction = await tx.transaction.create({
      data: {
        organizationId,
        branchId: input.branchId,
        tillId: input.tillId,
        providerId: input.providerId,
        shiftId: activeShift?.id,
        type: input.type,
        status: requiresApproval ? "REQUIRES_APPROVAL" : "COMPLETED",
        amount: input.amount,
        fee: input.fee ?? 0,
        commission: input.commission ?? 0,
        reference: input.reference || null,
        externalRef: input.externalRef || null,
        customerPhone: input.customerPhone || null,
        notes: input.notes || null,
        createdById: userId,
        transactedAt: input.transactedAt ?? new Date(),
      },
    });

    if (!requiresApproval) {
      const impact = getLedgerImpact(input.type);

      // Cash ledger entry
      if (impact.cashEffect && till.type === "CASH_BOX") {
        await appendCashLedgerEntry(
          {
            organizationId,
            branchId: input.branchId,
            tillId: input.tillId,
            transactionId: transaction.id,
            entryType: impact.cashEffect,
            amount: input.amount,
            description: `${input.type} - ${input.reference || transaction.id}`,
            entryDate: input.transactedAt ?? new Date(),
          },
          tx as unknown as Parameters<typeof appendCashLedgerEntry>[1]
        );
      }

      // Float ledger entry
      if (impact.floatEffect && provider && till.type === "FLOAT_ACCOUNT") {
        await appendFloatLedgerEntry(
          {
            organizationId,
            branchId: input.branchId,
            tillId: input.tillId,
            providerId: provider.id,
            transactionId: transaction.id,
            entryType: impact.floatEffect,
            amount: input.amount,
            description: `${input.type} - ${input.reference || transaction.id}`,
            entryDate: input.transactedAt ?? new Date(),
          },
          tx as unknown as Parameters<typeof appendFloatLedgerEntry>[1]
        );
      }
    }

    return transaction;
  });

  // 7. Audit log
  await createAuditLog({
    organizationId,
    userId,
    action: "TRANSACTION_CREATED",
    resourceType: "transaction",
    resourceId: result.id,
    description: `${input.type} of TZS ${input.amount.toLocaleString()} recorded`,
    after: {
      id: result.id,
      type: input.type,
      amount: input.amount,
      reference: input.reference,
    },
    ipAddress,
  });

  // 8. Check for alerts (non-blocking)
  checkAndCreateAlerts(organizationId, input.branchId).catch(console.error);

  return result;
}

export async function voidTransaction(
  transactionId: string,
  userId: string,
  organizationId: string,
  reason: string,
  ipAddress?: string
) {
  const transaction = await db.transaction.findFirst({
    where: { id: transactionId, organizationId },
    include: {
      cashEntries: true,
      floatEntries: true,
    },
  });

  if (!transaction) throw new Error("Transaction not found");
  if (transaction.status === "VOIDED") throw new Error("Already voided");
  if (transaction.type === "REVERSAL") {
    throw new Error("Reversal transactions cannot be voided");
  }

  const result = await db.$transaction(async (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]) => {
    const updated = await tx.transaction.update({
      where: { id: transactionId },
      data: {
        status: "VOIDED",
        notes: `${transaction.notes ? transaction.notes + " | " : ""}VOIDED: ${reason}`,
      },
    });

    const reversalTransaction = await tx.transaction.create({
      data: {
        organizationId: transaction.organizationId,
        branchId: transaction.branchId,
        tillId: transaction.tillId,
        providerId: transaction.providerId,
        shiftId: transaction.shiftId,
        type: "REVERSAL",
        status: "COMPLETED",
        amount: transaction.amount,
        fee: transaction.fee,
        commission: transaction.commission,
        reference: transaction.reference,
        externalRef: transaction.externalRef,
        customerPhone: transaction.customerPhone,
        notes: `Reversal for ${transaction.id}: ${reason}`,
        createdById: userId,
        approvedById: userId,
        relatedTxId: transaction.id,
        transactedAt: new Date(),
      },
    });

    for (const entry of transaction.cashEntries) {
      await appendCashLedgerEntry(
        {
          organizationId: entry.organizationId,
          branchId: entry.branchId,
          tillId: entry.tillId,
          transactionId: reversalTransaction.id,
          entryType: getOppositeEntryType(entry.entryType),
          amount: Number(entry.amount),
          description: `REVERSAL of ${transaction.id}: ${reason}`,
          entryDate: new Date(),
        },
        tx as unknown as Parameters<typeof appendCashLedgerEntry>[1]
      );
    }

    for (const entry of transaction.floatEntries) {
      await appendFloatLedgerEntry(
        {
          organizationId: entry.organizationId,
          branchId: entry.branchId,
          tillId: entry.tillId,
          providerId: entry.providerId,
          transactionId: reversalTransaction.id,
          entryType: getOppositeEntryType(entry.entryType),
          amount: Number(entry.amount),
          description: `REVERSAL of ${transaction.id}: ${reason}`,
          entryDate: new Date(),
        },
        tx as unknown as Parameters<typeof appendFloatLedgerEntry>[1]
      );
    }

    return {
      ...updated,
      reversalTransactionId: reversalTransaction.id,
    };
  });

  await createAuditLog({
    organizationId,
    userId,
    action: "TRANSACTION_VOIDED",
    resourceType: "transaction",
    resourceId: transactionId,
    description: `Transaction voided. Reason: ${reason}`,
    before: { status: transaction.status },
    after: { status: "VOIDED", reversalCreated: true, originalType: transaction.type },
    ipAddress,
  });

  return result;
}

export async function approveTransaction(
  transactionId: string,
  userId: string,
  organizationId: string,
  notes?: string,
  ipAddress?: string
) {
  const [transaction, settings] = await Promise.all([
    db.transaction.findFirst({
      where: { id: transactionId, organizationId },
    }),
    db.organizationSettings.findUnique({ where: { organizationId } }),
  ]);

  if (!transaction) {
    throw new Error("Transaction not found");
  }

  if (transaction.status !== "REQUIRES_APPROVAL") {
    throw new Error("Cannot approve transaction in its current status");
  }

  if (settings?.roleSeparationEnabled && transaction.createdById === userId) {
    throw new Error("Role separation prevents self-approval");
  }

  const result = await db.$transaction(async (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]) => {
    await appendDeferredLedgerEntries(transaction, tx);

    return tx.transaction.update({
      where: { id: transactionId },
      data: {
        status: "COMPLETED",
        approvedById: userId,
        notes: notes
          ? `${transaction.notes ? transaction.notes + " | " : ""}APPROVED: ${notes}`
          : transaction.notes,
      },
    });
  });

  await createAuditLog({
    organizationId,
    userId,
    action: "TRANSACTION_APPROVED",
    resourceType: "transaction",
    resourceId: transactionId,
    description: `Transaction approved${notes ? `: ${notes}` : ""}`,
    before: { status: transaction.status },
    after: { status: result.status, approvedById: userId },
    ipAddress,
  });

  checkAndCreateAlerts(organizationId, transaction.branchId).catch(console.error);

  return result;
}

export async function getTransactions(
  organizationId: string,
  filters: {
    branchId?: string;
    branchIds?: string[];
    type?: TransactionType;
    status?: string;
    providerId?: string;
    startDate?: Date;
    endDate?: Date;
    createdById?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  } = {}
) {
  const { page = 1, pageSize = 50 } = filters;
  const skip = (page - 1) * pageSize;

  const where: Prisma.TransactionWhereInput = {
    organizationId,
    ...(filters.branchId
      ? { branchId: filters.branchId }
      : filters.branchIds && filters.branchIds.length > 0
        ? { branchId: { in: filters.branchIds } }
        : {}),
    ...(filters.type && { type: filters.type }),
    ...(filters.status && { status: filters.status as "COMPLETED" | "VOIDED" | "PENDING" | "DISPUTED" | "REQUIRES_APPROVAL" }),
    ...(filters.providerId && { providerId: filters.providerId }),
    ...(filters.createdById && { createdById: filters.createdById }),
    ...((filters.startDate || filters.endDate) && {
      transactedAt: {
        ...(filters.startDate && { gte: filters.startDate }),
        ...(filters.endDate && { lte: filters.endDate }),
      },
    }),
    ...(filters.search && {
      OR: [
        { reference: { contains: filters.search, mode: "insensitive" } },
        { notes: { contains: filters.search, mode: "insensitive" } },
        { externalRef: { contains: filters.search, mode: "insensitive" } },
      ],
    }),
  };

  const [transactions, total] = await Promise.all([
    db.transaction.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        provider: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { transactedAt: "desc" },
      skip,
      take: pageSize,
    }),
    db.transaction.count({ where }),
  ]);

  return {
    data: transactions,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
