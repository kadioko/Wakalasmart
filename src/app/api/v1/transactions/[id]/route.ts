import { withAuth, ok, err, getBranchScope } from "@server/lib/api-helpers";
import { approveTransaction, voidTransaction } from "@server/services/transaction.service";
import { db } from "@server/lib/db";
import { z } from "zod";

const voidSchema = z.object({
  reason: z.string().min(5, "Provide a reason").max(500),
});

const approveSchema = z.object({
  notes: z.string().max(500).optional(),
});

export const GET = withAuth(async (req, ctx, params) => {
  const id = params?.id;
  if (!id) return err("Transaction ID required", 400);

  const transaction = await db.transaction.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: {
      branch: { select: { id: true, name: true } },
      provider: { select: { id: true, name: true, code: true } },
      createdBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      cashEntries: true,
      floatEntries: true,
    },
  });

  if (!transaction) return err("Transaction not found", 404);

  try {
    getBranchScope(ctx, transaction.branch.id);
  } catch (error) {
    if (error instanceof Error) {
      return err(error.message, 403);
    }
    return err("Access denied to this branch", 403);
  }

  return ok(transaction);
});

export const DELETE = withAuth(
  async (req, ctx, params) => {
    const id = params?.id;
    if (!id) return err("Transaction ID required", 400);

    const existingTransaction = await db.transaction.findFirst({
      where: { id, organizationId: ctx.organizationId },
      select: { branchId: true },
    });

    if (!existingTransaction) {
      return err("Transaction not found", 404);
    }

    try {
      getBranchScope(ctx, existingTransaction.branchId);
    } catch (error) {
      if (error instanceof Error) {
        return err(error.message, 403);
      }
      return err("Access denied to this branch", 403);
    }

    const body = await req.json();
    const parsed = voidSchema.safeParse(body);
    if (!parsed.success) {
      return err("Reason is required", 400);
    }

    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const transaction = await voidTransaction(
      id,
      ctx.userId,
      ctx.organizationId,
      parsed.data.reason,
      ipAddress
    );

    return ok(transaction);
  },
  { requiredRoles: ["OWNER", "BRANCH_MANAGER"] }
);

export const PATCH = withAuth(
  async (req, ctx, params) => {
    const id = params?.id;
    if (!id) return err("Transaction ID required", 400);

    const existingTransaction = await db.transaction.findFirst({
      where: { id, organizationId: ctx.organizationId },
      select: { branchId: true },
    });

    if (!existingTransaction) {
      return err("Transaction not found", 404);
    }

    try {
      getBranchScope(ctx, existingTransaction.branchId);
    } catch (error) {
      if (error instanceof Error) {
        return err(error.message, 403);
      }
      return err("Access denied to this branch", 403);
    }

    const body = await req.json().catch(() => ({}));
    const parsed = approveSchema.safeParse(body);
    if (!parsed.success) {
      return err("Invalid approval payload", 400);
    }

    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const transaction = await approveTransaction(
      id,
      ctx.userId,
      ctx.organizationId,
      parsed.data.notes,
      ipAddress
    );

    return ok(transaction);
  },
  { requiredRoles: ["OWNER", "BRANCH_MANAGER", "ACCOUNTANT"] }
);
