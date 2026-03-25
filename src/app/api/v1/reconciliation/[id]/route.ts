import { withAuth, ok, err } from "@server/lib/api-helpers";
import {
  submitReconciliation,
  approveReconciliation,
  rejectReconciliation,
} from "@server/services/reconciliation.service";
import { db } from "@server/lib/db";


export const GET = withAuth(async (req, ctx, params) => {
  const id = params?.id;
  if (!id) return err("Reconciliation ID required", 400);

  const rec = await db.reconciliation.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: {
      branch: { select: { id: true, name: true } },
      submittedBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      floatItems: true,
    },
  });

  if (!rec) return err("Reconciliation not found", 404);
  return ok(rec);
});

export const PATCH = withAuth(
  async (req, ctx, params) => {
    const id = params?.id;
    if (!id) return err("Reconciliation ID required", 400);

    const body = await req.json();
    const action = body.action as string;

    if (action === "submit") {
      const result = await submitReconciliation(id, ctx.userId, ctx.organizationId);
      return ok(result);
    }

    if (action === "approve") {
      const result = await approveReconciliation(
        id,
        ctx.userId,
        ctx.organizationId,
        body.notes
      );
      return ok(result);
    }

    if (action === "reject") {
      if (!body.reason) return err("Rejection reason required", 400);
      const result = await rejectReconciliation(
        id,
        ctx.userId,
        ctx.organizationId,
        body.reason
      );
      return ok(result);
    }

    return err("Unknown action", 400);
  },
  { requiredRoles: ["OWNER", "BRANCH_MANAGER", "ACCOUNTANT"] }
);
