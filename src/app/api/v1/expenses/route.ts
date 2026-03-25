import { withAuth, ok, err, getPagination } from "@server/lib/api-helpers";
import { db } from "@server/lib/db";
import { createAuditLog } from "@server/services/audit.service";
import { z } from "zod";
import { ExpenseCategory } from "@prisma/client";

const createExpenseSchema = z.object({
  branchId: z.string().min(1),
  category: z.nativeEnum(ExpenseCategory),
  description: z.string().min(2).max(200),
  amount: z.number().positive(),
  isCash: z.boolean().optional().default(true),
  notes: z.string().optional(),
  paidAt: z.coerce.date().optional(),
});

export const GET = withAuth(async (req, ctx) => {
  const url = new URL(req.url);
  const { page, pageSize } = getPagination(req);
  const branchId = url.searchParams.get("branchId") || undefined;

  const where = {
    organizationId: ctx.organizationId,
    isDeleted: false,
    ...(branchId && { branchId }),
    ...(ctx.role === "CASHIER" && { createdById: ctx.userId }),
  };

  const [expenses, total] = await Promise.all([
    db.expense.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { paidAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.expense.count({ where }),
  ]);

  return ok({ data: expenses, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
});

export const POST = withAuth(
  async (req, ctx) => {
    const body = await req.json();
    const parsed = createExpenseSchema.safeParse(body);
    if (!parsed.success) return err("Invalid input", 422);

    const { branchId, category, description, amount, isCash, notes, paidAt } = parsed.data;

    if (ctx.role === "CASHIER" && !ctx.branchIds.includes(branchId)) {
      return err("Access denied to this branch", 403);
    }

    const expense = await db.expense.create({
      data: {
        organizationId: ctx.organizationId,
        branchId,
        category,
        description,
        amount,
        isCash: isCash ?? true,
        notes: notes || null,
        paidAt: paidAt ?? new Date(),
        createdById: ctx.userId,
        status: "APPROVED",
      },
    });

    await createAuditLog({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "EXPENSE_CREATED",
      resourceType: "expense",
      resourceId: expense.id,
      description: `Expense: ${description} — TZS ${amount.toLocaleString()}`,
    });

    return ok(expense, 201);
  },
  { requiredRoles: ["OWNER", "BRANCH_MANAGER", "CASHIER"] }
);
