import type { RequestContext } from "@server/lib/api-helpers";
import { ExpenseStatus } from "@prisma/client";

function parseReportDate(value: string) {
  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  return new Date(value);
}

export function normalizeReportDateRange(startDate?: string | null, endDate?: string | null) {
  const start = startDate
    ? parseReportDate(startDate)
    : new Date(new Date().setDate(new Date().getDate() - 30));
  const end = endDate ? parseReportDate(endDate) : new Date();

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function getAccessibleBranchIds(
  ctx: RequestContext,
  requestedBranchId?: string
): string[] | undefined {
  if (ctx.role === "OWNER" || ctx.role === "SUPER_ADMIN" || ctx.role === "ACCOUNTANT") {
    return requestedBranchId ? [requestedBranchId] : undefined;
  }

  if (requestedBranchId) {
    if (!ctx.branchIds.includes(requestedBranchId)) {
      throw new Error("Access denied to this branch");
    }
    return [requestedBranchId];
  }

  return ctx.branchIds;
}

export function buildTransactionReportWhere(params: {
  organizationId: string;
  branchIds?: string[];
  startDate: Date;
  endDate: Date;
}) {
  return {
    organizationId: params.organizationId,
    ...(params.branchIds?.length ? { branchId: { in: params.branchIds } } : {}),
    status: "COMPLETED" as const,
    relatedTxId: null,
    transactedAt: { gte: params.startDate, lte: params.endDate },
  };
}

export function buildExpenseReportWhere(params: {
  organizationId: string;
  branchIds?: string[];
  startDate: Date;
  endDate: Date;
}) {
  return {
    organizationId: params.organizationId,
    ...(params.branchIds?.length ? { branchId: { in: params.branchIds } } : {}),
    status: ExpenseStatus.APPROVED,
    isDeleted: false,
    paidAt: { gte: params.startDate, lte: params.endDate },
  };
}

export function buildReconciliationReportWhere(params: {
  organizationId: string;
  branchIds?: string[];
  startDate: Date;
  endDate: Date;
}) {
  return {
    organizationId: params.organizationId,
    ...(params.branchIds?.length ? { branchId: { in: params.branchIds } } : {}),
    date: { gte: params.startDate, lte: params.endDate },
  };
}
