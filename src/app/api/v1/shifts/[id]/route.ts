import { withAuth, ok, err, getBranchScope } from "@server/lib/api-helpers";
import { db } from "@server/lib/db";
import { createAuditLog } from "@server/services/audit.service";
import { z } from "zod";

const closeShiftSchema = z.object({
  closingBalances: z.array(
    z.object({
      tillId: z.string().min(1),
      countedBalance: z.number().min(0),
      varianceNotes: z.string().max(500).optional(),
    })
  ).min(1),
  notes: z.string().max(1000).optional(),
});

export const PATCH = withAuth(
  async (req, ctx, params) => {
    const id = params?.id;
    if (!id) return err("Shift ID required", 400);

    const shift = await db.shift.findFirst({
      where: { id, organizationId: ctx.organizationId },
      include: {
        shiftTills: { include: { till: true } },
      },
    });

    if (!shift) return err("Shift not found", 404);
    if (shift.status !== "OPEN") return err("Only open shifts can be closed", 400);

    try {
      getBranchScope(ctx, shift.branchId);
    } catch (error) {
      if (error instanceof Error) {
        return err(error.message, 403);
      }
      return err("Access denied to this branch", 403);
    }

    if (ctx.role === "CASHIER" && shift.openedById !== ctx.userId) {
      return err("You can only close your own shifts", 403);
    }

    const body = await req.json().catch(() => null);
    const parsed = closeShiftSchema.safeParse(body);
    if (!parsed.success) {
      return err("Invalid close shift payload", 400);
    }

    const tillIds = shift.shiftTills.map((item) => item.tillId);
    const providedTillIds = parsed.data.closingBalances.map((item) => item.tillId);

    const hasExactCoverage = tillIds.length === providedTillIds.length
      && tillIds.every((tillId) => providedTillIds.includes(tillId));

    if (!hasExactCoverage) {
      return err("Closing balances must be provided for all shift tills", 400);
    }

    const updatedShift = await db.$transaction(async (tx) => {
      for (const shiftTill of shift.shiftTills) {
        const closing = parsed.data.closingBalances.find((item) => item.tillId === shiftTill.tillId);
        if (!closing) {
          throw new Error("Missing closing balance for a shift till");
        }

        const openingBalance = Number(shiftTill.openingBalance);
        const countedBalance = closing.countedBalance;
        const variance = countedBalance - openingBalance;

        await tx.shiftTill.update({
          where: { id: shiftTill.id },
          data: {
            closingBalance: countedBalance,
            countedBalance,
            variance,
            varianceNotes: closing.varianceNotes || null,
          },
        });
      }

      return tx.shift.update({
        where: { id },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
          closedById: ctx.userId,
          notes: parsed.data.notes || shift.notes,
        },
        include: {
          branch: { select: { id: true, name: true } },
          openedBy: { select: { id: true, name: true } },
          closedBy: { select: { id: true, name: true } },
          shiftTills: { include: { till: { include: { provider: true } } } },
          _count: { select: { transactions: true } },
        },
      });
    });

    await createAuditLog({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "SHIFT_CLOSED",
      resourceType: "shift",
      resourceId: updatedShift.id,
      description: `Shift closed for branch ${shift.branchId}`,
      after: {
        status: updatedShift.status,
        closedAt: updatedShift.closedAt,
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return ok(updatedShift);
  },
  { requiredRoles: ["OWNER", "BRANCH_MANAGER", "CASHIER"] }
);
