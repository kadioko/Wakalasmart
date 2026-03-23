import { NextRequest } from "next/server";
import { withAuth, ok, getPagination } from "@/lib/api-helpers";
import { getAlerts } from "@/services/alert.service";
import { AlertType } from "@prisma/client";

export const GET = withAuth(async (req, ctx) => {
  const url = new URL(req.url);
  const { page, pageSize } = getPagination(req);

  const result = await getAlerts(ctx.organizationId, {
    branchId: url.searchParams.get("branchId") || undefined,
    type: (url.searchParams.get("type") as AlertType) || undefined,
    status: (url.searchParams.get("status") as "UNREAD" | "READ" | "DISMISSED") || undefined,
    page,
    pageSize,
  });

  return ok(result);
});
