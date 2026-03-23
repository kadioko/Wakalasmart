import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody, getPagination } from "@/lib/api-helpers";
import {
  createReconciliation,
  getReconciliations,
} from "@/services/reconciliation.service";
import { createReconciliationSchema } from "@/lib/validations/reconciliation";

export const GET = withAuth(async (req, ctx) => {
  const url = new URL(req.url);
  const { page, pageSize } = getPagination(req);

  const result = await getReconciliations(ctx.organizationId, {
    branchId: url.searchParams.get("branchId") || undefined,
    status: url.searchParams.get("status") || undefined,
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
});

export const POST = withAuth(
  async (req, ctx) => {
    let input;
    try {
      input = await parseBody(req, createReconciliationSchema);
    } catch (e: unknown) {
      if (e instanceof Error && "validationErrors" in e) {
        return err(JSON.stringify((e as Error & { validationErrors: unknown }).validationErrors), 422);
      }
      throw e;
    }

    if (ctx.role === "CASHIER" && !ctx.branchIds.includes(input.branchId)) {
      return err("Access denied to this branch", 403);
    }

    const reconciliation = await createReconciliation(
      input,
      ctx.userId,
      ctx.organizationId
    );

    return ok(reconciliation, 201);
  },
  { requiredRoles: ["OWNER", "BRANCH_MANAGER", "CASHIER"] }
);
