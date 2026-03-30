import { withAuth, ok } from "@server/lib/api-helpers";
import { db } from "@server/lib/db";
import { createAuditLog } from "@server/services/audit.service";

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
    const before = await db.organization.findUnique({
      where: { id: ctx.organizationId },
      select: {
        name: true,
        tin: true,
        phone: true,
        email: true,
        address: true,
        city: true,
      },
    });

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

    await createAuditLog({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "SETTINGS_CHANGED",
      resourceType: "organization",
      resourceId: org.id,
      description: "Organization settings updated",
      before: before ?? undefined,
      after: {
        name: org.name,
        tin: org.tin,
        phone: org.phone,
        email: org.email,
        address: org.address,
        city: org.city,
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return ok(org);
  },
  { requiredRoles: ["OWNER"] }
);
