import { withAuth, ok, err, parseBody } from "@server/lib/api-helpers";
import { db } from "@server/lib/db";
import { z } from "zod";
import { getTillCashBalance, getTillFloatBalance } from "@server/services/balance.service";

const createTillSchema = z.object({
  branchId: z.string().min(1),
  name: z.string().min(1).max(100),
  type: z.enum(["CASH_BOX", "FLOAT_ACCOUNT"]),
  providerId: z.string().optional(),
  description: z.string().optional(),
});

export const GET = withAuth(async (req, ctx) => {
  const url = new URL(req.url);
  const branchId = url.searchParams.get("branchId") || undefined;

  const tills = await db.till.findMany({
    where: {
      organizationId: ctx.organizationId,
      ...(branchId && { branchId }),
      status: "ACTIVE",
    },
    include: {
      branch: { select: { id: true, name: true } },
      provider: { select: { id: true, name: true, code: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Enrich with current balances
  const enriched = await Promise.all(
    tills.map(async (till) => {
      const balance =
        till.type === "CASH_BOX"
          ? await getTillCashBalance(till.id)
          : till.providerId
            ? await getTillFloatBalance(till.id, till.providerId)
            : 0;
      return { ...till, currentBalance: balance };
    })
  );

  return ok(enriched);
});

export const POST = withAuth(
  async (req, ctx) => {
    let input;
    try {
      input = await parseBody(req, createTillSchema);
    } catch {
      return err("Invalid input", 422);
    }

    if (input.type === "FLOAT_ACCOUNT" && !input.providerId) {
      return err("Provider required for float account", 400);
    }

    const till = await db.till.create({
      data: {
        organizationId: ctx.organizationId,
        branchId: input.branchId,
        providerId: input.providerId || null,
        name: input.name,
        type: input.type,
        description: input.description || null,
      },
    });

    return ok(till, 201);
  },
  { requiredRoles: ["OWNER", "BRANCH_MANAGER"] }
);
