import { db } from "@/lib/db";
import { getBranchBalances, getOrganizationBalances } from "./balance.service";
import type { DashboardStats, FloatBalance } from "@/types";

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function getOwnerDashboard(
  organizationId: string
): Promise<DashboardStats> {
  const { start, end } = getTodayRange();

  const [
    txStats,
    branches,
    orgBalances,
    unreadAlerts,
    openShifts,
    unreconciledCount,
  ] = await Promise.all([
    db.transaction.aggregate({
      where: {
        organizationId,
        status: "COMPLETED",
        transactedAt: { gte: start, lte: end },
      },
      _sum: { amount: true, commission: true },
      _count: true,
    }),
    db.branch.findMany({
      where: { organizationId, status: "ACTIVE" },
      select: { id: true, name: true },
    }),
    getOrganizationBalances(organizationId),
    db.alert.count({
      where: { organizationId, status: "UNREAD" },
    }),
    db.shift.count({
      where: { organizationId, status: "OPEN" },
    }),
    db.branch.count({
      where: {
        organizationId,
        status: "ACTIVE",
        reconciliations: {
          none: {
            date: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
            status: "APPROVED",
          },
        },
      },
    }),
  ]);

  const cashInStats = await db.transaction.aggregate({
    where: {
      organizationId,
      type: { in: ["DEPOSIT", "FLOAT_PURCHASE", "OWNER_INJECTION", "BANK_WITHDRAWAL"] },
      status: "COMPLETED",
      transactedAt: { gte: start, lte: end },
    },
    _sum: { amount: true },
  });

  const cashOutStats = await db.transaction.aggregate({
    where: {
      organizationId,
      type: { in: ["WITHDRAWAL", "EXPENSE", "OWNER_WITHDRAWAL", "BANK_DEPOSIT"] },
      status: "COMPLETED",
      transactedAt: { gte: start, lte: end },
    },
    _sum: { amount: true },
  });

  // Branch summaries
  const branchSummaries = await Promise.all(
    branches.map(async (branch) => {
      const balances = orgBalances.find((b) => b.branchId === branch.id);
      const txCountToday = await db.transaction.count({
        where: {
          organizationId,
          branchId: branch.id,
          status: "COMPLETED",
          transactedAt: { gte: start, lte: end },
        },
      });
      const commissionToday = await db.transaction.aggregate({
        where: {
          organizationId,
          branchId: branch.id,
          status: "COMPLETED",
          transactedAt: { gte: start, lte: end },
        },
        _sum: { commission: true },
      });
      const hasOpenShift = await db.shift.count({
        where: { organizationId, branchId: branch.id, status: "OPEN" },
      });
      const isReconciled =
        (await db.reconciliation.count({
          where: {
            organizationId,
            branchId: branch.id,
            date: { gte: new Date(start), lte: new Date(end) },
            status: "APPROVED",
          },
        })) > 0;
      const alertCount = await db.alert.count({
        where: { organizationId, branchId: branch.id, status: "UNREAD" },
      });

      return {
        id: branch.id,
        name: branch.name,
        cashBalance: balances?.cashBalance ?? 0,
        txCountToday,
        commissionToday: Number(commissionToday._sum.commission ?? 0),
        hasOpenShift: hasOpenShift > 0,
        isReconciled,
        alertCount,
      };
    })
  );

  // Aggregate float balances across all branches (first branch for now, sum later)
  const allFloatBalances = orgBalances.flatMap((b) => b.floatBalances);
  const aggregatedFloatBalances = allFloatBalances.reduce(
    (acc, fb) => {
      const existing = acc.find((a) => a.providerCode === fb.providerCode);
      if (existing) {
        existing.balance += fb.balance;
      } else {
        acc.push({ ...fb });
      }
      return acc;
    },
    [] as FloatBalance[]
  );

  const totalCashBalance = orgBalances.reduce(
    (sum, b) => sum + b.cashBalance,
    0
  );

  return {
    totalTransactionsToday: txStats._count,
    totalCashInToday: Number(cashInStats._sum.amount ?? 0),
    totalCashOutToday: Number(cashOutStats._sum.amount ?? 0),
    totalCommissionsToday: Number(txStats._sum.commission ?? 0),
    currentCashBalance: totalCashBalance,
    floatBalances: aggregatedFloatBalances,
    activeAlerts: unreadAlerts,
    openShifts,
    unreconciledBranches: unreconciledCount,
    branches: branchSummaries,
  };
}

export async function getCashierDashboard(
  organizationId: string,
  userId: string,
  branchId: string
) {
  const { start, end } = getTodayRange();

  const activeShift = await db.shift.findFirst({
    where: { organizationId, branchId, openedById: userId, status: "OPEN" },
    include: { shiftTills: { include: { till: true } } },
  });

  const shiftStats = activeShift
    ? await db.transaction.aggregate({
        where: {
          shiftId: activeShift.id,
          status: "COMPLETED",
        },
        _sum: { amount: true, commission: true },
        _count: true,
      })
    : null;

  const balances = await getBranchBalances(organizationId, branchId);

  const todayAlerts = await db.alert.count({
    where: { organizationId, branchId, status: "UNREAD" },
  });

  return {
    activeShift,
    shiftStats: shiftStats
      ? {
          txCount: shiftStats._count,
          totalAmount: Number(shiftStats._sum.amount ?? 0),
          totalCommission: Number(shiftStats._sum.commission ?? 0),
        }
      : null,
    balances,
    todayAlerts,
  };
}

export async function getDashboardTrends(
  organizationId: string,
  days = 7
): Promise<{ date: string; deposits: number; withdrawals: number; commission: number }[]> {
  const results = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const [deposits, withdrawals, commission] = await Promise.all([
      db.transaction.aggregate({
        where: {
          organizationId,
          type: "DEPOSIT",
          status: "COMPLETED",
          transactedAt: { gte: start, lte: end },
        },
        _sum: { amount: true },
      }),
      db.transaction.aggregate({
        where: {
          organizationId,
          type: "WITHDRAWAL",
          status: "COMPLETED",
          transactedAt: { gte: start, lte: end },
        },
        _sum: { amount: true },
      }),
      db.transaction.aggregate({
        where: {
          organizationId,
          status: "COMPLETED",
          transactedAt: { gte: start, lte: end },
        },
        _sum: { commission: true },
      }),
    ]);

    results.push({
      date: date.toISOString().split("T")[0],
      deposits: Number(deposits._sum.amount ?? 0),
      withdrawals: Number(withdrawals._sum.amount ?? 0),
      commission: Number(commission._sum.commission ?? 0),
    });
  }
  return results;
}
