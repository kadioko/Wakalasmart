import { NextRequest } from "next/server";
import { withAuth, ok, getPagination } from "@/lib/api-helpers";
import { getAuditLogs } from "@/services/audit.service";
import { AuditAction } from "@prisma/client";

export const GET = withAuth(
  async (req, ctx) => {
    const url = new URL(req.url);
    const { page, pageSize } = getPagination(req);

    const result = await getAuditLogs(ctx.organizationId, {
      userId: url.searchParams.get("userId") || undefined,
      action: (url.searchParams.get("action") as AuditAction) || undefined,
      resourceType: url.searchParams.get("resourceType") || undefined,
      startDate: url.searchParams.get("startDate")
        ? new Date(url.searchParams.get("startDate")!)
        : undefined,
      endDate: url.searchParams.get("endDate")
        ? new Date(url.searchParams.get("endDate")!)
        : undefined,
      page,
      pageSize,
    });

    return ok(result);
  },
  { requiredRoles: ["OWNER", "BRANCH_MANAGER", "ACCOUNTANT"] }
);
