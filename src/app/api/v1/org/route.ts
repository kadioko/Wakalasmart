import { withAuth, ok } from "@server/lib/api-helpers";
import { db } from "@server/lib/db";

export const GET = withAuth(async (req, ctx) => {
  const org = await db.organization.findUnique({
    where: { id: ctx.organizationId },
    include: { settings: true },
  });
  return ok(org);
});

export const PUT = withAuth(
  async (req, ctx) => {
    const body = await req.json();
    const org = await db.organization.update({
      where: { id: ctx.organizationId },
      data: {
        name: body.name,
        tin: body.tin || null,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        city: body.city || null,
      },
    });
    return ok(org);
  },
  { requiredRoles: ["OWNER"] }
);
