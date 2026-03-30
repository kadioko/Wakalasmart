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

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20")));
  const skip = (page - 1) * pageSize;

  const where = {
    ...(status ? { status: status as "UNREAD" | "READ" | "DISMISSED" } : {}),
  };

  const [alerts, total] = await Promise.all([
    db.alert.findMany({
      where,
      include: {
        organization: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { triggeredAt: "desc" },
      skip,
      take: pageSize,
    }),
    db.alert.count({ where }),
  ]);

  return NextResponse.json({
    data: {
      data: alerts,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
