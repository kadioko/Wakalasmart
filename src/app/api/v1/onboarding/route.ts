import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { slugify } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  organizationName: z.string().min(2).max(100),
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

    if (user.organizationId) {
      return NextResponse.json(
        { error: "User already has an organization" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 422 });
    }

    const baseSlug = slugify(parsed.data.organizationName);
    let slug = baseSlug;
    let attempt = 0;
    while (await db.organization.findUnique({ where: { slug } })) {
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    // Create organization + default settings + first branch + providers
    const org = await db.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: parsed.data.organizationName,
          slug,
          status: "TRIAL",
        },
      });

      // Create default settings
      await tx.organizationSettings.create({
        data: { organizationId: organization.id },
      });

      // Create default alert settings
      await tx.alertSettings.create({
        data: { organizationId: organization.id },
      });

      // Update user to OWNER with this org
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          organizationId: organization.id,
          role: "OWNER",
        },
      });

      // Create default providers
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

      return organization;
    });

    return NextResponse.json({ data: org }, { status: 201 });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
