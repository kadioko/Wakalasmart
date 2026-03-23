import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { createAuditLog } from "@/services/audit.service";
import { inviteStaffSchema } from "@/lib/validations/auth";

export const GET = withAuth(async (req, ctx) => {
  const users = await db.user.findMany({
    where: {
      organizationId: ctx.organizationId,
      role: { not: "SUPER_ADMIN" },
    },
    include: {
      userBranches: {
        include: { branch: { select: { id: true, name: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return ok(users);
});

export const POST = withAuth(
  async (req, ctx) => {
    let input;
    try {
      input = await parseBody(req, inviteStaffSchema);
    } catch {
      return err("Invalid input", 422);
    }

    // Check if email already exists in this org
    const existing = await db.user.findFirst({
      where: { email: input.email, organizationId: ctx.organizationId },
    });
    if (existing) return err("User with this email already exists", 400);

    // Create pending invitation
    const invitation = await db.invitation.create({
      data: {
        organizationId: ctx.organizationId,
        email: input.email,
        role: input.role,
        branchIds: input.branchIds,
        invitedById: ctx.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // TODO: Send invitation email with token

    await createAuditLog({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "USER_INVITED",
      resourceType: "invitation",
      resourceId: invitation.id,
      description: `Invitation sent to ${input.email} for role ${input.role}`,
    });

    return ok({ invitation, message: "Invitation sent successfully" }, 201);
  },
  { requiredRoles: ["OWNER", "BRANCH_MANAGER"] }
);
