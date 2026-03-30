import { withAuth, ok } from "@server/lib/api-helpers";
import { db } from "@server/lib/db";

export const GET = withAuth(async (_req, ctx) => {
  const user = await db.user.findUnique({
    where: { id: ctx.userId },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      userBranches: {
        include: {
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return ok({
    id: ctx.userId,
    role: ctx.role,
    organizationId: ctx.organizationId || null,
    branchIds: ctx.branchIds,
    email: user?.email ?? null,
    name: user?.name ?? null,
    organization: user?.organization ?? null,
    branches: user?.userBranches.map((item) => item.branch) ?? [],
  });
});
