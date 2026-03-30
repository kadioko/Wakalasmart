import { db } from "@server/lib/db";
import { AlertSeverity, AlertType, Prisma } from "@prisma/client";

async function hasActiveSimilarAlert(params: {
  organizationId: string;
  branchId?: string;
  type: AlertType;
  title: string;
  message: string;
}) {
  const existing = await db.alert.findFirst({
    where: {
      organizationId: params.organizationId,
      branchId: params.branchId,
      type: params.type,
      title: params.title,
      message: params.message,
      status: { in: ["UNREAD", "READ"] },
    },
    orderBy: { triggeredAt: "desc" },
  });

  return Boolean(existing);
}

export async function createAlert(params: {
  organizationId: string;
  branchId?: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const alreadyExists = await hasActiveSimilarAlert({
      organizationId: params.organizationId,
      branchId: params.branchId,
      type: params.type,
      title: params.title,
      message: params.message,
    });

    if (alreadyExists) {
      return;
    }

    await db.alert.create({
      data: {
        organizationId: params.organizationId,
        branchId: params.branchId,
        type: params.type,
        severity: params.severity,
        title: params.title,
        message: params.message,
        metadata: params.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    console.error("Failed to create alert:", error);
  }
}

export async function checkAndCreateAlerts(
  organizationId: string,
  branchId: string
): Promise<void> {
  const [settings, orgSettings] = await Promise.all([
    db.alertSettings.findFirst({
      where: {
        organizationId,
        OR: [{ branchId }, { branchId: null }],
      },
      orderBy: { branchId: "desc" },
    }),
    db.organizationSettings.findUnique({ where: { organizationId } }),
  ]);

  if (!settings) return;

  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(now);
  dayEnd.setHours(23, 59, 59, 999);
  const yesterdayStart = new Date(dayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const yesterdayEnd = new Date(dayEnd);
  yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

  const settingsLargeTxThreshold = Number(settings.largeTxThreshold);
  const largeTxThreshold = Number(orgSettings?.largeTxThreshold ?? settingsLargeTxThreshold);

  // Check cash balance
  if (settings.lowCashEnabled) {
    const cashTill = await db.till.findFirst({
      where: { organizationId, branchId, type: "CASH_BOX", status: "ACTIVE" },
    });

    if (cashTill) {
      const lastEntry = await db.cashLedgerEntry.findFirst({
        where: { tillId: cashTill.id },
        orderBy: { entryDate: "desc" },
      });

      if (
        lastEntry &&
        Number(lastEntry.balanceAfter) < Number(settings.lowCashThreshold)
      ) {
        await createAlert({
          organizationId,
          branchId,
          type: "LOW_CASH",
          severity: "WARNING",
          title: "Low Cash Balance",
          message: `Cash balance is below threshold. Current: TZS ${Number(lastEntry.balanceAfter).toLocaleString()}`,
          metadata: {
            balance: Number(lastEntry.balanceAfter),
            threshold: Number(settings.lowCashThreshold),
          },
        });
      }
    }
  }

  // Check float balances per provider
  if (settings.lowFloatEnabled) {
    const floatTills = await db.till.findMany({
      where: { organizationId, branchId, type: "FLOAT_ACCOUNT", status: "ACTIVE" },
      include: { provider: true },
    });

    for (const till of floatTills) {
      if (!till.provider) continue;

      const lastEntry = await db.floatLedgerEntry.findFirst({
        where: { tillId: till.id, providerId: till.providerId! },
        orderBy: { entryDate: "desc" },
      });

      if (
        lastEntry &&
        Number(lastEntry.balanceAfter) < Number(till.provider.lowFloatThreshold)
      ) {
        await createAlert({
          organizationId,
          branchId,
          type: "LOW_FLOAT",
          severity: "WARNING",
          title: `Low ${till.provider.name} Float`,
          message: `${till.provider.name} float is below threshold. Current: TZS ${Number(lastEntry.balanceAfter).toLocaleString()}`,
          metadata: {
            providerId: till.providerId,
            providerName: till.provider.name,
            balance: Number(lastEntry.balanceAfter),
            threshold: Number(till.provider.lowFloatThreshold),
          },
        });
      }
    }
  }

  if (settings.largeTxEnabled) {
    const largeTransactions = await db.transaction.findMany({
      where: {
        organizationId,
        branchId,
        status: "COMPLETED",
        amount: { gte: largeTxThreshold },
        transactedAt: { gte: dayStart, lte: dayEnd },
      },
      select: { id: true, type: true, amount: true, reference: true },
      take: 5,
      orderBy: { transactedAt: "desc" },
    });

    for (const transaction of largeTransactions) {
      await createAlert({
        organizationId,
        branchId,
        type: "LARGE_TRANSACTION",
        severity: "INFO",
        title: "Large Transaction Detected",
        message: `${transaction.type} of TZS ${Number(transaction.amount).toLocaleString()} exceeded threshold${transaction.reference ? ` (${transaction.reference})` : ""}`,
        metadata: {
          transactionId: transaction.id,
          threshold: largeTxThreshold,
          amount: Number(transaction.amount),
        },
      });
    }
  }

  if (settings.duplicateRefEnabled) {
    const duplicateReferences = await db.transaction.groupBy({
      by: ["reference"],
      where: {
        organizationId,
        branchId,
        status: { not: "VOIDED" },
        reference: { not: null },
        transactedAt: { gte: dayStart, lte: dayEnd },
      },
      _count: { reference: true },
      having: {
        reference: { _count: { gt: 1 } },
      },
    });

    for (const duplicate of duplicateReferences) {
      if (!duplicate.reference) continue;
      await createAlert({
        organizationId,
        branchId,
        type: "DUPLICATE_REFERENCE",
        severity: "WARNING",
        title: "Duplicate Reference Detected",
        message: `Reference ${duplicate.reference} has been used ${duplicate._count.reference} times today`,
        metadata: {
          reference: duplicate.reference,
          count: duplicate._count.reference,
        },
      });
    }
  }

  if (settings.highReversalsEnabled) {
    const reversalCount = await db.transaction.count({
      where: {
        organizationId,
        branchId,
        type: "REVERSAL",
        status: "COMPLETED",
        transactedAt: { gte: dayStart, lte: dayEnd },
      },
    });

    if (reversalCount >= settings.highReversalsThreshold) {
      await createAlert({
        organizationId,
        branchId,
        type: "HIGH_REVERSALS",
        severity: "WARNING",
        title: "High Reversal Activity",
        message: `${reversalCount} reversals recorded today in this branch`,
        metadata: {
          count: reversalCount,
          threshold: settings.highReversalsThreshold,
        },
      });
    }
  }

  if (settings.shiftNotClosedEnabled) {
    const staleShift = await db.shift.findFirst({
      where: {
        organizationId,
        branchId,
        status: "OPEN",
        openedAt: { lt: dayStart },
      },
      orderBy: { openedAt: "asc" },
      include: {
        openedBy: { select: { id: true, name: true } },
      },
    });

    if (staleShift) {
      await createAlert({
        organizationId,
        branchId,
        type: "SHIFT_NOT_CLOSED",
        severity: "WARNING",
        title: "Shift Still Open",
        message: `A shift opened by ${staleShift.openedBy.name} on ${staleShift.openedAt.toLocaleString()} is still open`,
        metadata: {
          shiftId: staleShift.id,
          openedById: staleShift.openedBy.id,
          openedAt: staleShift.openedAt.toISOString(),
        },
      });
    }
  }

  if (settings.unreconciledDayEnabled) {
    const yesterdayReconciliation = await db.reconciliation.findFirst({
      where: {
        organizationId,
        branchId,
        date: { gte: yesterdayStart, lte: yesterdayEnd },
        status: { in: ["SUBMITTED", "APPROVED"] },
      },
    });

    if (!yesterdayReconciliation) {
      await createAlert({
        organizationId,
        branchId,
        type: "UNRECONCILED_DAY",
        severity: "WARNING",
        title: "Unreconciled Previous Day",
        message: "No submitted or approved reconciliation was found for the previous business day",
        metadata: {
          expectedDate: yesterdayStart.toISOString(),
        },
      });
    }
  }
}

export async function checkDuplicateReference(
  organizationId: string,
  reference: string
): Promise<boolean> {
  const count = await db.transaction.count({
    where: {
      organizationId,
      reference,
      status: { not: "VOIDED" },
    },
  });
  return count > 0;
}

export async function getAlerts(
  organizationId: string,
  filters: {
    branchId?: string;
    type?: AlertType;
    status?: "UNREAD" | "READ" | "DISMISSED";
    page?: number;
    pageSize?: number;
  } = {}
) {
  const { page = 1, pageSize = 20 } = filters;
  const skip = (page - 1) * pageSize;

  const where = {
    organizationId,
    ...(filters.branchId && { branchId: filters.branchId }),
    ...(filters.type && { type: filters.type }),
    ...(filters.status && { status: filters.status }),
  };

  const [alerts, total] = await Promise.all([
    db.alert.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
      },
      orderBy: { triggeredAt: "desc" },
      skip,
      take: pageSize,
    }),
    db.alert.count({ where }),
  ]);

  return {
    data: alerts,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function markAlertRead(
  alertId: string,
  organizationId: string
): Promise<void> {
  await db.alert.updateMany({
    where: { id: alertId, organizationId },
    data: { status: "READ", readAt: new Date() },
  });
}

export async function dismissAlert(
  alertId: string,
  organizationId: string
): Promise<void> {
  await db.alert.updateMany({
    where: { id: alertId, organizationId },
    data: { status: "DISMISSED", dismissedAt: new Date() },
  });
}
