import { withAuth, ok, err } from "@server/lib/api-helpers";
import { markAlertRead, dismissAlert } from "@server/services/alert.service";
import { createAuditLog } from "@server/services/audit.service";

export const POST = withAuth(async (req, ctx, params) => {
  const id = params?.id;
  const url = new URL(req.url);
  const action = url.pathname.split("/").pop();

  if (!id) return err("Alert ID required", 400);

  if (action === "read") {
    await markAlertRead(id, ctx.organizationId);
    await createAuditLog({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "SETTINGS_CHANGED",
      resourceType: "alert",
      resourceId: id,
      description: "Alert marked as read",
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
      action: "SETTINGS_CHANGED",
      resourceType: "alert",
      resourceId: id,
      description: "Alert dismissed",
      after: { status: "DISMISSED" },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });
    return ok({ success: true });
  }

  return err("Unknown action", 400);
});
