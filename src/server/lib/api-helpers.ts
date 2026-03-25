import { NextRequest, NextResponse } from "next/server";
import { auth } from "@server/lib/auth";
import { db } from "@server/lib/db";
import { UserRole } from "@prisma/client";
import { ZodSchema } from "zod";

export interface RequestContext {
  userId: string;
  organizationId: string;
  role: UserRole;
  branchIds: string[];
}

export type ApiHandler = (
  req: NextRequest,
  ctx: RequestContext,
  params?: Record<string, string>
) => Promise<NextResponse>;

/**
 * Wraps an API handler with auth, tenant isolation, and error handling.
 * Handles Next.js 15+ async params.
 */
export function withAuth(
  handler: ApiHandler,
  options: {
    requiredRoles?: UserRole[];
    requireOrg?: boolean;
  } = {}
) {
  return async (req: NextRequest, { params }: { params?: Promise<Record<string, string>> | Record<string, string> } = {}) => {
    // Resolve params — Next.js 15+ returns a Promise
    const resolvedParams = params ? await Promise.resolve(params) : undefined;
    try {
      const session = await auth.api.getSession({ headers: req.headers });

      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const user = await db.user.findUnique({
        where: { id: session.user.id },
        include: {
          userBranches: { select: { branchId: true } },
        },
      });

      if (!user || !user.isActive) {
        return NextResponse.json(
          { error: "Account not found or inactive" },
          { status: 401 }
        );
      }

      if (options.requiredRoles && !options.requiredRoles.includes(user.role)) {
        return NextResponse.json(
          { error: "Insufficient permissions" },
          { status: 403 }
        );
      }

      if (options.requireOrg !== false && !user.organizationId && user.role !== "SUPER_ADMIN") {
        return NextResponse.json(
          { error: "No organization associated" },
          { status: 403 }
        );
      }

      const ctx: RequestContext = {
        userId: user.id,
        organizationId: user.organizationId ?? "",
        role: user.role,
        branchIds: user.userBranches.map((ub) => ub.branchId),
      };

      return await handler(req, ctx, resolvedParams);
    } catch (error) {
      console.error("API Error:", error);

      if (error instanceof Error) {
        // Known business logic errors
        if (
          error.message.includes("not found") ||
          error.message.includes("No open shift") ||
          error.message.includes("already exists") ||
          error.message.includes("Cannot approve") ||
          error.message.includes("Role separation")
        ) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
      }

      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

/**
 * Scopes a query to the user's accessible branches.
 * Owners see all branches, managers/cashiers see assigned branches only.
 */
export function getBranchScope(
  ctx: RequestContext,
  requestedBranchId?: string
): string | undefined {
  if (ctx.role === "OWNER" || ctx.role === "SUPER_ADMIN" || ctx.role === "ACCOUNTANT") {
    return requestedBranchId;
  }

  // Branch managers and cashiers are scoped to their branches
  if (requestedBranchId) {
    if (!ctx.branchIds.includes(requestedBranchId)) {
      throw new Error("Access denied to this branch");
    }
    return requestedBranchId;
  }

  // If no specific branch requested, return undefined (caller handles the list)
  return undefined;
}

/**
 * Parse and validate request body with Zod
 */
export async function parseBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): Promise<T> {
  const body = await req.json();
  const result = schema.safeParse(body);
  if (!result.success) {
    throw Object.assign(new Error("Validation failed"), {
      validationErrors: result.error.flatten().fieldErrors,
    });
  }
  return result.data;
}

/**
 * Standard success response
 */
export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

/**
 * Standard error response
 */
export function err(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Get pagination params from URL search params
 */
export function getPagination(req: NextRequest): { page: number; pageSize: number } {
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20"))
  );
  return { page, pageSize };
}
