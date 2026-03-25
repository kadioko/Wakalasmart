import { NextResponse } from "next/server";
import { db } from "@server/lib/db";

export async function GET() {
  try {
    // Check database connection and user/account counts
    const [userCount, accountCount] = await Promise.all([
      db.user.count(),
      db.account.count(),
    ]);

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "0.1.0",
      database: {
        connected: true,
        users: userCount,
        accounts: accountCount,
      },
    });
  } catch (error) {
    return NextResponse.json({
      status: "error",
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    }, { status: 500 });
  }
}
