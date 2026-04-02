import { withAuth, ok, err } from "@server/lib/api-helpers";
import { markAlertRead, dismissAlert } from "@server/services/alert.service";
import { createAuditLog } from "@server/services/audit.service";
import { db } from "@server/lib/db";

export const POST = withAuth(async (req, ctx, params) => {
  const id = params?.id;
  const url = new URL(req.url);
  const action = url.pathname.split("/").pop();

  if (!id) return err("Alert ID required", 400);

  const before = await db.alert.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: {
      status: true,
      readAt: true,
      dismissedAt: true,
    },
  });

  if (!before) return err("Alert not found", 404);

  if (action === "read") {
    await markAlertRead(id, ctx.organizationId);
    await createAuditLog({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "ALERT_READ",
      resourceType: "alert",
      resourceId: id,
      description: "Alert marked as read",
      before: {
        status: before.status,
        readAt: before.readAt?.toISOString(),
      },
      after: { status: "READ" },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });
    return ok({ success: true });
  }

  if (action === "dismiss") {
    await dismissAlert(id, ctx.organizationId);
    await createAuditLog({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "ALERT_DISMISSED",
      resourceType: "alert",
      resourceId: id,
      description: "Alert dismissed",
      before: {
        status: before.status,
        dismissedAt: before.dismissedAt?.toISOString(),
      },
      after: { status: "DISMISSED" },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });
    return ok({ success: true });
  }

  return err("Unknown action", 400);
});
