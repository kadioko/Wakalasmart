import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { createAuditLog } from "@/services/audit.service";
import { z } from "zod";
import { ProviderCode } from "@prisma/client";

const createProviderSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.nativeEnum(ProviderCode),
  commissionRate: z.number().min(0).max(100).optional().default(0),
  commissionNotes: z.string().optional(),
  lowFloatThreshold: z.number().min(0).optional().default(100000),
});

export const GET = withAuth(async (req, ctx) => {
  const providers = await db.provider.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: { createdAt: "asc" },
  });
  return ok(providers);
});

export const POST = withAuth(
  async (req, ctx) => {
    let input;
    try {
      input = await parseBody(req, createProviderSchema);
    } catch {
      return err("Invalid input", 422);
    }

    const existing = await db.provider.findUnique({
      where: {
        organizationId_code: {
          organizationId: ctx.organizationId,
          code: input.code,
        },
      },
    });

    if (existing) return err(`Provider ${input.code} already exists`, 400);

    const provider = await db.provider.create({
      data: {
        organizationId: ctx.organizationId,
        name: input.name,
        code: input.code,
        commissionRate: input.commissionRate ?? 0,
        commissionNotes: input.commissionNotes || null,
        lowFloatThreshold: input.lowFloatThreshold ?? 100000,
      },
    });

    await createAuditLog({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "PROVIDER_UPDATED",
      resourceType: "provider",
      resourceId: provider.id,
      description: `Provider ${input.name} (${input.code}) created`,
    });

    return ok(provider, 201);
  },
  { requiredRoles: ["OWNER"] }
);
