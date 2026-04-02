import { withAuth, ok, err } from "@server/lib/api-helpers";
import { db } from "@server/lib/db";
import {
  buildExpenseReportWhere,
  buildReconciliationReportWhere,
  buildTransactionReportWhere,
  getAccessibleBranchIds,
  normalizeReportDateRange,
} from "@server/services/report-filters";

export const GET = withAuth(async (req, ctx) => {
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const requestedBranchId = url.searchParams.get("branchId") || undefined;
  const { start: startDate, end: endDate } = normalizeReportDateRange(
    url.searchParams.get("startDate"),
    url.searchParams.get("endDate")
  );

  if (!type) return err("Report type required", 400);

  let branchIds: string[] | undefined;
  try {
    branchIds = getAccessibleBranchIds(ctx, requestedBranchId);
  } catch (error) {
    if (error instanceof Error) {
      return err(error.message, 403);
    }
    return err("Access denied to this branch", 403);
  }

  const transactionFilter = buildTransactionReportWhere({
    organizationId: ctx.organizationId,
    branchIds,
    startDate,
    endDate,
  });

  switch (type) {
    case "daily-summary": {
      const data = await db.transaction.groupBy({
        by: ["type"],
        where: transactionFilter,
        _sum: { amount: true, commission: true, fee: true },
        _count: true,
      });
      return ok(data);
    }

    case "provider-performance": {
      const data = await db.transaction.groupBy({
        by: ["providerId"],
        where: { ...transactionFilter, providerId: { not: null } },
        _sum: { amount: true, commission: true },
        _count: true,
      });

      const enriched = await Promise.all(
        data.map(async (item) => {
          const provider = item.providerId
            ? await db.provider.findUnique({ where: { id: item.providerId } })
            : null;
          return { ...item, provider };
        })
      );

      return ok(enriched);
    }

    case "staff-performance": {
      const data = await db.transaction.groupBy({
        by: ["createdById"],
        where: transactionFilter,
        _sum: { amount: true, commission: true },
        _count: true,
      });

      const enriched = await Promise.all(
        data.map(async (item) => {
          const user = await db.user.findUnique({
            where: { id: item.createdById },
            select: { id: true, name: true, role: true },
          });
          return { ...item, user };
        })
      );

      return ok(enriched);
    }

    case "branch-performance": {
      const data = await db.transaction.groupBy({
        by: ["branchId"],
        where: transactionFilter,
        _sum: { amount: true, commission: true, fee: true },
        _count: true,
      });

      const enriched = await Promise.all(
        data.map(async (item) => {
          const branch = await db.branch.findUnique({
            where: { id: item.branchId },
            select: { id: true, name: true },
          });
          return { ...item, branch };
        })
      );

      return ok(enriched);
    }

    case "commission": {
      const data = await db.transaction.groupBy({
        by: ["providerId", "type"],
        where: { ...transactionFilter, commission: { gt: 0 } },
        _sum: { commission: true },
        _count: true,
      });
      return ok(data);
    }

    case "expenses": {
      const data = await db.expense.groupBy({
        by: ["category"],
        where: buildExpenseReportWhere({
          organizationId: ctx.organizationId,
          branchIds,
          startDate,
          endDate,
        }),
        _sum: { amount: true },
        _count: true,
      });
      return ok(data);
    }

    case "variance": {
      const recs = await db.reconciliation.findMany({
        where: {
          ...buildReconciliationReportWhere({
            organizationId: ctx.organizationId,
            branchIds,
            startDate,
            endDate,
          }),
          status: { in: ["APPROVED", "SUBMITTED"] },
        },
        include: {
          branch: { select: { id: true, name: true } },
          floatItems: true,
        },
        orderBy: { date: "desc" },
      });
      return ok(recs);
    }

    case "reconciliation-history": {
      const recs = await db.reconciliation.findMany({
        where: buildReconciliationReportWhere({
          organizationId: ctx.organizationId,
          branchIds,
          startDate,
          endDate,
        }),
        include: {
          branch: { select: { id: true, name: true } },
          submittedBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
        },
        orderBy: { date: "desc" },
      });
      return ok(recs);
    }

    default:
      return err(`Unknown report type: ${type}`, 400);
  }
});
