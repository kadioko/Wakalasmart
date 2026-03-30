import { db } from "@server/lib/db";
import { createAuditLog } from "./audit.service";
import type { CreateReconciliationInput } from "@server/validations/reconciliation";
import { summarizeProviderTransactions } from "./reconciliation-summary";

export async function createReconciliation(
  input: CreateReconciliationInput,
  userId: string,
  organizationId: string
) {
  const { branchId, date, actualCash, floatItems, notes, shiftId } = input;

  // Get opening cash from first ledger entry of the day
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const cashTill = await db.till.findFirst({
    where: { organizationId, branchId, type: "CASH_BOX", status: "ACTIVE" },
  });

  // Get opening balance (last balance before today)
  const openingEntry = await db.cashLedgerEntry.findFirst({
    where: { tillId: cashTill?.id, entryDate: { lt: dayStart } },
    orderBy: { entryDate: "desc" },
  });
  const openingCash = openingEntry ? Number(openingEntry.balanceAfter) : 0;

  // Calculate expected cash from today's movements
  const todayCashEntries = await db.cashLedgerEntry.findMany({
    where: {
      tillId: cashTill?.id,
      entryDate: { gte: dayStart, lte: dayEnd },
    },
  });

  const cashCredits = todayCashEntries
    .filter((e) => e.entryType === "CREDIT")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const cashDebits = todayCashEntries
    .filter((e) => e.entryType === "DEBIT")
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const expectedCash = openingCash + cashCredits - cashDebits;
  const cashVariance = actualCash - expectedCash;

  // Build float items
  const providers = await db.provider.findMany({
    where: {
      organizationId,
      id: { in: floatItems.map((f) => f.providerId) },
    },
  });

  const floatItemsData = await Promise.all(
    floatItems.map(async (item) => {
      const provider = providers.find((p) => p.id === item.providerId);
      if (!provider) throw new Error(`Provider ${item.providerId} not found`);

      const floatTill = await db.till.findFirst({
        where: {
          organizationId,
          branchId,
          providerId: item.providerId,
          type: "FLOAT_ACCOUNT",
        },
      });

      const openingFloatEntry = await db.floatLedgerEntry.findFirst({
        where: {
          tillId: floatTill?.id,
          providerId: item.providerId,
          entryDate: { lt: dayStart },
        },
        orderBy: { entryDate: "desc" },
      });
      const openingFloat = openingFloatEntry
        ? Number(openingFloatEntry.balanceAfter)
        : 0;

      const todayFloatEntries = await db.floatLedgerEntry.findMany({
        where: {
          tillId: floatTill?.id,
          providerId: item.providerId,
          entryDate: { gte: dayStart, lte: dayEnd },
        },
      });

      const providerTransactions = await db.transaction.findMany({
        where: {
          organizationId,
          branchId,
          providerId: item.providerId,
          status: { in: ["COMPLETED", "VOIDED"] },
          transactedAt: { gte: dayStart, lte: dayEnd },
        },
        select: {
          type: true,
          amount: true,
          status: true,
          relatedTxId: true,
        },
      });

      const floatIn = todayFloatEntries
        .filter((e) => e.entryType === "CREDIT")
        .reduce((sum, e) => sum + Number(e.amount), 0);
      const floatOut = todayFloatEntries
        .filter((e) => e.entryType === "DEBIT")
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const { floatPurchased, depositsServed, withdrawalsServed } = summarizeProviderTransactions(
        providerTransactions
      );

      const expectedFloat = openingFloat + floatIn - floatOut;

      return {
        providerId: item.providerId,
        providerName: provider.name,
        openingFloat,
        floatPurchased,
        depositsServed,
        withdrawalsServed,
        expectedFloat,
        actualFloat: item.actualFloat,
        variance: item.actualFloat - expectedFloat,
        varianceNotes: item.varianceNotes || null,
      };
    })
  );

  const reconciliation = await db.reconciliation.create({
    data: {
      organizationId,
      branchId,
      shiftId: shiftId || null,
      date: new Date(date),
      status: "DRAFT",
      openingCash,
      expectedCash,
      actualCash,
      cashVariance,
      notes: notes || null,
      floatItems: {
        create: floatItemsData,
      },
    },
    include: {
      floatItems: true,
      branch: { select: { id: true, name: true } },
    },
  });

  await createAuditLog({
    organizationId,
    userId,
    action: "RECONCILIATION_CREATED",
    resourceType: "reconciliation",
    resourceId: reconciliation.id,
    description: `Reconciliation created for ${branchId} on ${date}`,
  });

  return reconciliation;
}

export async function submitReconciliation(
  reconciliationId: string,
  userId: string,
  organizationId: string
) {
  const rec = await db.reconciliation.findFirst({
    where: { id: reconciliationId, organizationId },
  });

  if (!rec) throw new Error("Reconciliation not found");
  if (rec.status !== "DRAFT") throw new Error("Only draft reconciliations can be submitted");

  const updated = await db.reconciliation.update({
    where: { id: reconciliationId },
    data: {
      status: "SUBMITTED",
      submittedById: userId,
      submittedAt: new Date(),
    },
  });

  await createAuditLog({
    organizationId,
    userId,
    action: "RECONCILIATION_SUBMITTED",
    resourceType: "reconciliation",
    resourceId: reconciliationId,
    description: "Reconciliation submitted for approval",
  });

  return updated;
}

export async function approveReconciliation(
  reconciliationId: string,
  userId: string,
  organizationId: string,
  notes?: string
) {
  const rec = await db.reconciliation.findFirst({
    where: { id: reconciliationId, organizationId },
  });

  if (!rec) throw new Error("Reconciliation not found");
  if (rec.status !== "SUBMITTED") throw new Error("Can only approve submitted reconciliations");

  // Check role separation
  const settings = await db.organizationSettings.findUnique({
    where: { organizationId },
  });
  if (settings?.roleSeparationEnabled && rec.submittedById === userId) {
    throw new Error("Cannot approve your own reconciliation. Role separation is enabled.");
  }

  const updated = await db.reconciliation.update({
    where: { id: reconciliationId },
    data: {
      status: "APPROVED",
      approvedById: userId,
      approvedAt: new Date(),
      ...(notes && { notes: `${rec.notes ? rec.notes + " | " : ""}APPROVED: ${notes}` }),
    },
  });

  await createAuditLog({
    organizationId,
    userId,
    action: "RECONCILIATION_APPROVED",
    resourceType: "reconciliation",
    resourceId: reconciliationId,
    description: "Reconciliation approved",
  });

  return updated;
}

export async function rejectReconciliation(
  reconciliationId: string,
  userId: string,
  organizationId: string,
  reason: string
) {
  const rec = await db.reconciliation.findFirst({
    where: { id: reconciliationId, organizationId },
  });

  if (!rec) throw new Error("Reconciliation not found");
  if (rec.status !== "SUBMITTED") throw new Error("Can only reject submitted reconciliations");

  const updated = await db.reconciliation.update({
    where: { id: reconciliationId },
    data: {
      status: "REJECTED",
      rejectedAt: new Date(),
      rejectionReason: reason,
    },
  });

  await createAuditLog({
    organizationId,
    userId,
    action: "RECONCILIATION_REJECTED",
    resourceType: "reconciliation",
    resourceId: reconciliationId,
    description: `Reconciliation rejected: ${reason}`,
  });

  return updated;
}

export async function getReconciliations(
  organizationId: string,
  filters: {
    branchId?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    pageSize?: number;
  } = {}
) {
  const { page = 1, pageSize = 20 } = filters;
  const skip = (page - 1) * pageSize;

  const where = {
    organizationId,
    ...(filters.branchId && { branchId: filters.branchId }),
    ...(filters.status && {
      status: filters.status as "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED",
    }),
    ...((filters.startDate || filters.endDate) && {
      date: {
        ...(filters.startDate && { gte: filters.startDate }),
        ...(filters.endDate && { lte: filters.endDate }),
      },
    }),
  };

  const [recs, total] = await Promise.all([
    db.reconciliation.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        submittedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        floatItems: true,
      },
      orderBy: { date: "desc" },
      skip,
      take: pageSize,
    }),
    db.reconciliation.count({ where }),
  ]);

  return {
    data: recs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
