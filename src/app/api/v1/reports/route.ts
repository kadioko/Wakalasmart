import { withAuth, ok, err } from "@server/lib/api-helpers";
import { db } from "@server/lib/db";

export const GET = withAuth(async (req, ctx) => {
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const branchId = url.searchParams.get("branchId") || undefined;
  const startDate = url.searchParams.get("startDate")
    ? new Date(url.searchParams.get("startDate")!)
    : new Date(new Date().setDate(new Date().getDate() - 30));
  const endDate = url.searchParams.get("endDate")
    ? new Date(url.searchParams.get("endDate")!)
    : new Date();

  if (!type) return err("Report type required", 400);

  const orgFilter = {
    organizationId: ctx.organizationId,
    ...(branchId && { branchId }),
    status: "COMPLETED" as const,
    transactedAt: { gte: startDate, lte: endDate },
  };

  switch (type) {
    case "daily-summary": {
      const data = await db.transaction.groupBy({
        by: ["type"],
        where: orgFilter,
        _sum: { amount: true, commission: true, fee: true },
        _count: true,
      });
      return ok(data);
    }

    case "provider-performance": {
      const data = await db.transaction.groupBy({
        by: ["providerId"],
        where: { ...orgFilter, providerId: { not: null } },
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
        where: orgFilter,
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
        where: { organizationId: ctx.organizationId, status: "COMPLETED", transactedAt: { gte: startDate, lte: endDate } },
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
        where: { ...orgFilter, commission: { gt: 0 } },
        _sum: { commission: true },
        _count: true,
      });
      return ok(data);
    }

    case "expenses": {
      const data = await db.expense.groupBy({
        by: ["category"],
        where: {
          organizationId: ctx.organizationId,
          ...(branchId && { branchId }),
          isDeleted: false,
          paidAt: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
        _count: true,
      });
      return ok(data);
    }

    case "variance": {
      const recs = await db.reconciliation.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(branchId && { branchId }),
          date: { gte: startDate, lte: endDate },
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
        where: {
          organizationId: ctx.organizationId,
          ...(branchId && { branchId }),
          date: { gte: startDate, lte: endDate },
        },
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
