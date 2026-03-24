import { withAuth, ok, err, getPagination, parseBody, getBranchScope } from "@/lib/api-helpers";
import { createTransaction, getTransactions } from "@/services/transaction.service";
import { createTransactionRefinedSchema } from "@/lib/validations/transaction";
import { TransactionType } from "@prisma/client";
import type { CreateTransactionInput } from "@/types";

export const GET = withAuth(async (req, ctx) => {
  const url = new URL(req.url);
  const { page, pageSize } = getPagination(req);

  const filters: {
    branchId?: string;
    type?: TransactionType;
    status?: string;
    providerId?: string;
    createdById?: string;
    search?: string;
    startDate?: Date;
    endDate?: Date;
    page: number;
    pageSize: number;
    branchIds?: string[];
  } = {
    branchId: url.searchParams.get("branchId") || undefined,
    type: (url.searchParams.get("type") as TransactionType) || undefined,
    status: url.searchParams.get("status") || undefined,
    providerId: url.searchParams.get("providerId") || undefined,
    createdById: url.searchParams.get("userId") || undefined,
    search: url.searchParams.get("search") || undefined,
    startDate: url.searchParams.get("startDate")
      ? new Date(url.searchParams.get("startDate")!)
      : undefined,
    endDate: url.searchParams.get("endDate")
      ? new Date(url.searchParams.get("endDate")!)
      : undefined,
    page,
    pageSize,
    branchIds: undefined as string[] | undefined,
  };

  try {
    filters.branchId = getBranchScope(ctx, filters.branchId);
  } catch (error) {
    if (error instanceof Error) {
      return err(error.message, 403);
    }
    return err("Access denied to this branch", 403);
  }

  if (ctx.role !== "OWNER" && ctx.role !== "SUPER_ADMIN" && ctx.role !== "ACCOUNTANT" && !filters.branchId) {
    filters.branchIds = ctx.branchIds;
  }

  const result = await getTransactions(ctx.organizationId, filters);
  return ok(result);
});

export const POST = withAuth(
  async (req, ctx) => {
    let input: CreateTransactionInput;
    try {
      input = await parseBody(req, createTransactionRefinedSchema);
    } catch (e: unknown) {
      if (e instanceof Error && "validationErrors" in e) {
        return err(
          JSON.stringify((e as Error & { validationErrors: unknown }).validationErrors),
          422
        );
      }
      throw e;
    }

    // Cashiers can only create in assigned branches
    if (ctx.role === "CASHIER" && !ctx.branchIds.includes(input.branchId)) {
      return err("You are not assigned to this branch", 403);
    }

    try {
      input.branchId = getBranchScope(ctx, input.branchId) ?? input.branchId;
    } catch (error) {
      if (error instanceof Error) {
        return err(error.message, 403);
      }
      return err("Access denied to this branch", 403);
    }

    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const transaction = await createTransaction(
      input,
      ctx.userId,
      ctx.organizationId,
      ipAddress
    );

    return ok(transaction, 201);
  },
  { requiredRoles: ["OWNER", "BRANCH_MANAGER", "CASHIER"] }
);
