import { withAuth, ok, err, parseBody } from "@server/lib/api-helpers";
import { db } from "@server/lib/db";
import { createAuditLog } from "@server/services/audit.service";
import { appendCashLedgerEntry, appendFloatLedgerEntry } from "@server/services/balance.service";
import { z } from "zod";

const openShiftSchema = z.object({
  branchId: z.string().min(1),
  openingBalances: z.array(
    z.object({
      tillId: z.string().min(1),
      openingBalance: z.number().min(0),
    })
  ).min(1),
});

export const GET = withAuth(async (req, ctx) => {
  const url = new URL(req.url);
  const branchId = url.searchParams.get("branchId") || undefined;
  const status = url.searchParams.get("status") || undefined;
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));

  const where = {
    organizationId: ctx.organizationId,
    ...(branchId && { branchId }),
    ...(status && { status: status as "OPEN" | "CLOSED" | "APPROVED" }),
    ...(ctx.role === "CASHIER" && { openedById: ctx.userId }),
  };

  const [shifts, total] = await Promise.all([
    db.shift.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        openedBy: { select: { id: true, name: true } },
        closedBy: { select: { id: true, name: true } },
        shiftTills: { include: { till: { include: { provider: true } } } },
        _count: { select: { transactions: true } },
      },
      orderBy: { openedAt: "desc" },
      skip: (page - 1) * 20,
      take: 20,
    }),
    db.shift.count({ where }),
  ]);

  return ok({ data: shifts, total, page, pageSize: 20 });
});

export const POST = withAuth(
  async (req, ctx) => {
    let input;
    try {
      input = await parseBody(req, openShiftSchema);
    } catch (e: unknown) {
      if (e instanceof Error && "validationErrors" in e) {
        return err(JSON.stringify((e as Error & { validationErrors: unknown }).validationErrors), 422);
      }
      throw e;
    }

    // Check if shift already open for this user/branch
    const existingShift = await db.shift.findFirst({
      where: {
        organizationId: ctx.organizationId,
        branchId: input.branchId,
        status: "OPEN",
        openedById: ctx.userId,
      },
    });

    if (existingShift) {
      return err("You already have an open shift for this branch", 400);
    }

    // Validate tills belong to this org and branch
    const tillIds = input.openingBalances.map((b) => b.tillId);
    const tills = await db.till.findMany({
      where: {
        id: { in: tillIds },
        organizationId: ctx.organizationId,
        branchId: input.branchId,
      },
    });

    if (tills.length !== tillIds.length) {
      return err("One or more tills not found or not in this branch", 400);
    }

    // Create shift in transaction
    const shift = await db.$transaction(async (tx) => {
      const newShift = await tx.shift.create({
        data: {
          organizationId: ctx.organizationId,
          branchId: input.branchId,
          openedById: ctx.userId,
          shiftTills: {
            create: input.openingBalances.map((b) => ({
              tillId: b.tillId,
              openingBalance: b.openingBalance,
            })),
          },
        },
        include: {
          shiftTills: true,
          branch: { select: { id: true, name: true } },
        },
      });

      // Create opening balance ledger entries
      for (const balance of input.openingBalances) {
        const till = tills.find((t) => t.id === balance.tillId);
        if (!till) continue;

        if (till.type === "CASH_BOX" && balance.openingBalance > 0) {
          await appendCashLedgerEntry(
            {
              organizationId: ctx.organizationId,
              branchId: input.branchId,
              tillId: balance.tillId,
              entryType: "CREDIT",
              amount: balance.openingBalance,
              description: `Opening balance for shift ${newShift.id}`,
            },
            tx as unknown as Parameters<typeof appendCashLedgerEntry>[1]
          );
        } else if (till.type === "FLOAT_ACCOUNT" && till.providerId && balance.openingBalance > 0) {
          await appendFloatLedgerEntry(
            {
              organizationId: ctx.organizationId,
              branchId: input.branchId,
              tillId: balance.tillId,
              providerId: till.providerId,
              entryType: "CREDIT",
              amount: balance.openingBalance,
              description: `Opening balance for shift ${newShift.id}`,
            },
            tx as unknown as Parameters<typeof appendFloatLedgerEntry>[1]
          );
        }
      }

      return newShift;
    });

    await createAuditLog({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "SHIFT_OPENED",
      resourceType: "shift",
      resourceId: shift.id,
      description: `Shift opened for branch ${input.branchId}`,
      after: {
        branchId: input.branchId,
        shiftId: shift.id,
        openingBalances: input.openingBalances,
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return ok(shift, 201);
  },
  { requiredRoles: ["OWNER", "BRANCH_MANAGER", "CASHIER"] }
);
