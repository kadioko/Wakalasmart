import { NextRequest, NextResponse } from "next/server";
import { auth } from "@server/lib/auth";
import { db } from "@server/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [totals, recentOrganizations, recentUsers] = await Promise.all([
    Promise.all([
      db.organization.count(),
      db.user.count(),
      db.branch.count(),
      db.transaction.count(),
    ]),
    db.organization.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, createdAt: true, status: true },
    }),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({
    data: {
      stats: {
        organizations: totals[0],
        users: totals[1],
        branches: totals[2],
        transactions: totals[3],
      },
      recentOrganizations,
      recentUsers,
    },
  });
}
