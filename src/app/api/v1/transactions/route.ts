import { NextRequest } from "next/server";
import { withAuth, ok, err, getPagination, parseBody } from "@/lib/api-helpers";
import { createTransaction, getTransactions } from "@/services/transaction.service";
import { createTransactionRefinedSchema } from "@/lib/validations/transaction";
import { TransactionType } from "@prisma/client";

export const GET = withAuth(async (req, ctx) => {
  const url = new URL(req.url);
  const { page, pageSize } = getPagination(req);

  const filters = {
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
  };

  // Scope cashiers to their branches
  if (ctx.role === "CASHIER" && !filters.branchId) {
    // Return only transactions from their branches
  }

  const result = await getTransactions(ctx.organizationId, filters);
  return ok(result);
});

export const POST = withAuth(
  async (req, ctx) => {
    let input;
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
