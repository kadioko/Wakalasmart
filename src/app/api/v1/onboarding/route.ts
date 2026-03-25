import { auth } from "@server/lib/auth";
import { db } from "@server/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { generateBranchCode, slugify } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  organizationName: z.string().min(2).max(100),
  firstBranchName: z.string().min(2).max(100),
  businessPhone: z.string().optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 422 });
    }

    const businessPhone = parsed.data.businessPhone || null;
    const city = parsed.data.city || null;

    if (user.organizationId) {
      const existingBranchCount = await db.branch.count({
        where: { organizationId: user.organizationId },
      });

      if (existingBranchCount > 0) {
        return NextResponse.json(
          { error: "User already has an organization" },
          { status: 400 }
        );
      }

      const organization = await db.organization.findUnique({
        where: { id: user.organizationId },
      });

      if (!organization) {
        return NextResponse.json({ error: "Organization not found" }, { status: 404 });
      }

      const branchCode = generateBranchCode(parsed.data.firstBranchName, 1);

      const result = await db.$transaction(async (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]) => {
        const branch = await tx.branch.create({
          data: {
            organizationId: organization.id,
            name: parsed.data.firstBranchName,
            code: branchCode,
            phone: businessPhone,
            location: city,
          },
        });

        await tx.userBranch.create({
          data: {
            userId: user.id,
            branchId: branch.id,
          },
        });

        await tx.till.create({
          data: {
            organizationId: organization.id,
            branchId: branch.id,
            name: "Main Cash Box",
            type: "CASH_BOX",
          },
        });

        await tx.alertSettings.create({
          data: {
            organizationId: organization.id,
            branchId: branch.id,
          },
        });

        await tx.organization.update({
          where: { id: organization.id },
          data: {
            phone: businessPhone,
            city,
          },
        });

        return { organization, branch };
      });

      return NextResponse.json({ data: result }, { status: 201 });
    }

    const baseSlug = slugify(parsed.data.organizationName);
    let slug = baseSlug;
    let attempt = 0;
    while (await db.organization.findUnique({ where: { slug } })) {
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    const result = await db.$transaction(async (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]) => {
      const organization = await tx.organization.create({
        data: {
          name: parsed.data.organizationName,
          slug,
          status: "TRIAL",
          phone: businessPhone,
          city,
        },
      });

      await tx.organizationSettings.create({
        data: { organizationId: organization.id },
      });

      await tx.alertSettings.create({
        data: { organizationId: organization.id },
      });

      await tx.user.update({
        where: { id: session.user.id },
        data: {
          organizationId: organization.id,
          role: "OWNER",
        },
      });

      const branchCode = generateBranchCode(parsed.data.firstBranchName, 1);

      const branch = await tx.branch.create({
        data: {
          organizationId: organization.id,
          name: parsed.data.firstBranchName,
          code: branchCode,
          phone: businessPhone,
          location: city,
        },
      });

      await tx.userBranch.create({
        data: {
          userId: session.user.id,
          branchId: branch.id,
        },
      });

      await tx.till.create({
        data: {
          organizationId: organization.id,
          branchId: branch.id,
          name: "Main Cash Box",
          type: "CASH_BOX",
        },
      });

      await tx.alertSettings.create({
        data: {
          organizationId: organization.id,
          branchId: branch.id,
        },
      });

      const defaultProviders = [
        { name: "M-Pesa", code: "MPESA" as const },
        { name: "Airtel Money", code: "AIRTEL" as const },
        { name: "Tigo Pesa", code: "TIGO" as const },
        { name: "HaloPesa", code: "HALOPESA" as const },
      ];

      await tx.provider.createMany({
        data: defaultProviders.map((p) => ({
          organizationId: organization.id,
          name: p.name,
          code: p.code,
        })),
      });

      return { organization, branch };
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
