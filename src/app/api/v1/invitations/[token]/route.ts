import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/services/audit.service";

function isInvitationExpired(expiresAt: Date) {
  return expiresAt.getTime() < Date.now();
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> | { token: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const token = resolvedParams?.token;

  if (!token) {
    return NextResponse.json({ error: "Invitation token is required" }, { status: 400 });
  }

  const invitation = await db.invitation.findUnique({
    where: { token },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  const branches = invitation.branchIds.length
    ? await db.branch.findMany({
        where: {
          organizationId: invitation.organizationId,
          id: { in: invitation.branchIds },
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  return NextResponse.json(
    {
      data: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        expired: isInvitationExpired(invitation.expiresAt),
        organization: invitation.organization,
        branches,
      },
    },
    { status: 200 }
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> | { token: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const token = resolvedParams?.token;

  if (!token) {
    return NextResponse.json({ error: "Invitation token is required" }, { status: 400 });
  }

  const session = await auth.api.getSession({ headers: req.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [invitation, user] = await Promise.all([
    db.invitation.findUnique({
      where: { token },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    db.user.findUnique({ where: { id: session.user.id } }),
  ]);

  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (invitation.status !== "PENDING") {
    return NextResponse.json({ error: "Invitation is no longer pending" }, { status: 400 });
  }

  if (isInvitationExpired(invitation.expiresAt)) {
    await db.invitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    });

    return NextResponse.json({ error: "Invitation has expired" }, { status: 400 });
  }

  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return NextResponse.json(
      { error: "You must sign in with the invited email address to accept this invitation" },
      { status: 403 }
    );
  }

  if (user.organizationId && user.organizationId !== invitation.organizationId) {
    return NextResponse.json(
      { error: "This account already belongs to a different organization" },
      { status: 409 }
    );
  }

  const result = await db.$transaction(async (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]) => {
    const updatedUser = await tx.user.update({
      where: { id: user.id },
      data: {
        organizationId: invitation.organizationId,
        role: invitation.role,
        isActive: true,
      },
    });

    if (invitation.branchIds.length > 0) {
      await tx.userBranch.createMany({
        data: invitation.branchIds.map((branchId: string) => ({
          userId: user.id,
          branchId,
        })),
        skipDuplicates: true,
      });
    }

    const acceptedInvitation = await tx.invitation.update({
      where: { id: invitation.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });

    return { updatedUser, acceptedInvitation };
  });

  await createAuditLog({
    organizationId: invitation.organizationId,
    userId: user.id,
    action: "USER_ROLE_CHANGED",
    resourceType: "invitation",
    resourceId: invitation.id,
    description: `${user.email} accepted an invitation to join ${invitation.organization.name}`,
    after: {
      role: result.updatedUser.role,
      organizationId: result.updatedUser.organizationId,
      branchIds: invitation.branchIds,
    },
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
    userAgent: req.headers.get("user-agent") || undefined,
  });

  return NextResponse.json(
    {
      data: {
        invitationId: result.acceptedInvitation.id,
        organizationId: result.updatedUser.organizationId,
        role: result.updatedUser.role,
      },
    },
    { status: 200 }
  );
}
