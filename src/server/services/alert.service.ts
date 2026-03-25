import { db } from "@server/lib/db";
import { AlertSeverity, AlertType, Prisma } from "@prisma/client";

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
  const settings = await db.alertSettings.findFirst({
    where: {
      organizationId,
      OR: [{ branchId }, { branchId: null }],
    },
    orderBy: { branchId: "desc" }, // branch-specific first
  });

  if (!settings) return;

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
