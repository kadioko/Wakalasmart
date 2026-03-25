import { withAuth, ok, err, parseBody } from "@server/lib/api-helpers";
import { db } from "@server/lib/db";
import { createAuditLog } from "@server/services/audit.service";
import { createBranchSchema } from "@server/validations/branch";


export const GET = withAuth(async (req, ctx) => {
  const branches = await db.branch.findMany({
    where: { organizationId: ctx.organizationId },
    include: {
      _count: {
        select: { tills: true, userBranches: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return ok(branches);
});

export const POST = withAuth(
  async (req, ctx) => {
    let input;
    try {
      input = await parseBody(req, createBranchSchema);
    } catch (e: unknown) {
      if (e instanceof Error && "validationErrors" in e) {
        return err(JSON.stringify((e as Error & { validationErrors: unknown }).validationErrors), 422);
      }
      throw e;
    }

    // Generate code if not provided
    const existingCount = await db.branch.count({
      where: { organizationId: ctx.organizationId },
    });
    const code =
      input.code ||
      `${input.name.substring(0, 3).toUpperCase()}-${String(existingCount + 1).padStart(3, "0")}`;

    const branch = await db.branch.create({
      data: {
        organizationId: ctx.organizationId,
        name: input.name,
        code,
        location: input.location || null,
        phone: input.phone || null,
        managerId: input.managerId || null,
        openingTime: input.openingTime || null,
        closingTime: input.closingTime || null,
      },
    });

    // Auto-create a cash till for the branch
    await db.till.create({
      data: {
        organizationId: ctx.organizationId,
        branchId: branch.id,
        name: "Main Cash Box",
        type: "CASH_BOX",
      },
    });

    // Create default alert settings for branch
    await db.alertSettings.create({
      data: {
        organizationId: ctx.organizationId,
        branchId: branch.id,
      },
    });

    await createAuditLog({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "BRANCH_CREATED",
      resourceType: "branch",
      resourceId: branch.id,
      description: `Branch "${branch.name}" created`,
      after: { name: branch.name, code },
    });

    return ok(branch, 201);
  },
  { requiredRoles: ["OWNER"] }
);
