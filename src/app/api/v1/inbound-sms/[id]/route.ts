import { withAuth, ok, err, parseBody, getBranchScope } from "@server/lib/api-helpers";
import {
  getInboundSmsById,
  processInboundSmsAction,
} from "@server/services/inbound-sms.service";
import { inboundSmsActionSchema } from "@server/validations/inbound-sms";

export const GET = withAuth(async (req, ctx, params) => {
  const id = params?.id;
  if (!id) return err("Inbound SMS ID required", 400);

  const sms = await getInboundSmsById(id, ctx.organizationId);

  if (
    sms.branchId &&
    ctx.role !== "OWNER" &&
    ctx.role !== "SUPER_ADMIN" &&
    ctx.role !== "ACCOUNTANT" &&
    !ctx.branchIds.includes(sms.branchId)
  ) {
    return err("Access denied to this branch", 403);
  }

  return ok(sms);
});

export const PATCH = withAuth(
  async (req, ctx, params) => {
    const id = params?.id;
    if (!id) return err("Inbound SMS ID required", 400);

    let input;
    try {
      input = await parseBody(req, inboundSmsActionSchema);
    } catch (e: unknown) {
      if (e instanceof Error && "validationErrors" in e) {
        return err(
          JSON.stringify((e as Error & { validationErrors: unknown }).validationErrors),
          422
        );
      }
      throw e;
    }

    const sms = await getInboundSmsById(id, ctx.organizationId);

    if (
      sms.branchId &&
      ctx.role !== "OWNER" &&
      ctx.role !== "SUPER_ADMIN" &&
      ctx.role !== "ACCOUNTANT" &&
      !ctx.branchIds.includes(sms.branchId)
    ) {
      return err("Access denied to this branch", 403);
    }

    if (input.action === "review" || input.action === "record") {
      try {
        input.payload.branchId = getBranchScope(ctx, input.payload.branchId) ?? input.payload.branchId;
      } catch (error) {
        if (error instanceof Error) {
          return err(error.message, 403);
        }
        return err("Access denied to this branch", 403);
      }
    }

    const result = await processInboundSmsAction(id, input, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return ok(result);
  },
  { requiredRoles: ["OWNER", "BRANCH_MANAGER", "CASHIER", "ACCOUNTANT"] }
);
