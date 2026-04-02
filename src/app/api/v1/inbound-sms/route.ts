import { withAuth, ok, err, getPagination, parseBody, getBranchScope } from "@server/lib/api-helpers";
import {
  getInboundSmsList,
  ingestInboundSms,
} from "@server/services/inbound-sms.service";
import { inboundSmsCreateSchema } from "@server/validations/inbound-sms";
import { SmsProcessingStatus, SmsProvider, SmsSource } from "@prisma/client";

export const GET = withAuth(async (req, ctx) => {
  const url = new URL(req.url);
  const { page, pageSize } = getPagination(req);

  const status = (url.searchParams.get("status") as SmsProcessingStatus | null) ?? undefined;
  const source = (url.searchParams.get("source") as SmsSource | null) ?? undefined;
  const provider = (url.searchParams.get("provider") as SmsProvider | null) ?? undefined;
  let branchId = url.searchParams.get("branchId") || undefined;

  try {
    branchId = getBranchScope(ctx, branchId) ?? branchId;
  } catch (error) {
    if (error instanceof Error) {
      return err(error.message, 403);
    }
    return err("Access denied to this branch", 403);
  }

  const result = await getInboundSmsList(ctx.organizationId, {
    branchId,
    status,
    source,
    provider,
    page,
    pageSize,
  });

  const scopedData =
    ctx.role === "OWNER" || ctx.role === "SUPER_ADMIN" || ctx.role === "ACCOUNTANT"
      ? result.data
      : result.data.filter((item) => !item.branchId || ctx.branchIds.includes(item.branchId));

  return ok({
    ...result,
    data: scopedData,
  });
});

export const POST = withAuth(
  async (req, ctx) => {
    let input;
    try {
      input = await parseBody(req, inboundSmsCreateSchema);
    } catch (e: unknown) {
      if (e instanceof Error && "validationErrors" in e) {
        return err(
          JSON.stringify((e as Error & { validationErrors: unknown }).validationErrors),
          422
        );
      }
      throw e;
    }

    try {
      if (input.branchId) {
        input.branchId = getBranchScope(ctx, input.branchId) ?? input.branchId;
      }
    } catch (error) {
      if (error instanceof Error) {
        return err(error.message, 403);
      }
      return err("Access denied to this branch", 403);
    }

    const sms = await ingestInboundSms(input, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return ok(sms, 201);
  },
  { requiredRoles: ["OWNER", "BRANCH_MANAGER", "CASHIER", "ACCOUNTANT"] }
);
