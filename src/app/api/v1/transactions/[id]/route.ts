import { NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api-helpers";
import { voidTransaction } from "@/services/transaction.service";
import { db } from "@/lib/db";
import { z } from "zod";

const voidSchema = z.object({
  reason: z.string().min(5, "Provide a reason").max(500),
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
  return ok(transaction);
});

export const DELETE = withAuth(
  async (req, ctx, params) => {
    const id = params?.id;
    if (!id) return err("Transaction ID required", 400);

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
