import { db } from "@server/lib/db";
import { AuditAction } from "@prisma/client";

export interface AuditLogParams {
  organizationId?: string;
  userId?: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  description: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        description: params.description,
        before: params.before as object | undefined,
        after: params.after as object | undefined,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: params.metadata as object | undefined,
      },
    });
  } catch (error) {
    // Audit logging should never break the main flow
    console.error("Failed to create audit log:", error);
  }
}

export async function getAuditLogs(
  organizationId: string,
  filters: {
    userId?: string;
    action?: AuditAction;
    resourceType?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    pageSize?: number;
  } = {}
) {
  const { page = 1, pageSize = 50 } = filters;
  const skip = (page - 1) * pageSize;

  const where = {
    organizationId,
    ...(filters.userId && { userId: filters.userId }),
    ...(filters.action && { action: filters.action }),
    ...(filters.resourceType && { resourceType: filters.resourceType }),
    ...((filters.startDate || filters.endDate) && {
      createdAt: {
        ...(filters.startDate && { gte: filters.startDate }),
        ...(filters.endDate && { lte: filters.endDate }),
      },
    }),
  };

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    db.auditLog.count({ where }),
  ]);

  return {
    data: logs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
