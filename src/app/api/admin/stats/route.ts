import { NextRequest, NextResponse } from "next/server";
import { auth } from "@server/lib/auth";
import { db } from "@server/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    totalOrganizations,
    activeOrganizations,
    totalUsers,
    activeUsers,
    pendingInvitations,
    systemAlerts,
  ] = await Promise.all([
    db.organization.count(),
    db.organization.count({ where: { status: "ACTIVE" } }),
    db.user.count(),
    db.user.count({ where: { isActive: true } }),
    db.invitation.count({ where: { status: "PENDING" } }),
    db.alert.count({ where: { status: "UNREAD" } }),
  ]);

  return NextResponse.json({
    data: {
      totalOrganizations,
      activeOrganizations,
      totalUsers,
      activeUsers,
      pendingInvitations,
      systemAlerts,
    },
  });
}
