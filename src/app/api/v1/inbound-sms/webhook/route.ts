import { NextRequest, NextResponse } from "next/server";
import { db } from "@server/lib/db";
import { ingestInboundSms } from "@server/services/inbound-sms.service";
import { SmsProvider } from "@prisma/client";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(req: NextRequest) {
  const secret = process.env.SMS_INGEST_WEBHOOK_SECRET;
  const provided = req.headers.get("x-sms-ingest-secret");

  if (!secret || provided !== secret) {
    return unauthorized();
  }

  const body = await req.json();

  const organizationId = typeof body.organizationId === "string" ? body.organizationId : "";
  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
  }

  const organization = await db.organization.findUnique({ where: { id: organizationId } });
  if (!organization) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const owner = await db.user.findFirst({
    where: {
      organizationId,
      role: "OWNER",
      isActive: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (!owner) {
    return NextResponse.json({ error: "No active owner found for organization" }, { status: 400 });
  }

  const sms = await ingestInboundSms(
    {
      source: "SMS_WEBHOOK",
      branchId: typeof body.branchId === "string" ? body.branchId : undefined,
      sender: typeof body.sender === "string" ? body.sender : undefined,
      message: typeof body.message === "string" ? body.message : "",
      receivedAt: body.receivedAt ? new Date(body.receivedAt) : undefined,
      providerHint:
        typeof body.providerHint === "string"
          ? (body.providerHint as SmsProvider)
          : undefined,
    },
    {
      organizationId,
      userId: owner.id,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    }
  );

  return NextResponse.json({ data: sms }, { status: 201 });
}
