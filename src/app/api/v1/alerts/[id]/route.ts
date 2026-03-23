import { NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api-helpers";
import { markAlertRead, dismissAlert } from "@/services/alert.service";

export const POST = withAuth(async (req, ctx, params) => {
  const id = params?.id;
  const url = new URL(req.url);
  const action = url.pathname.split("/").pop();

  if (!id) return err("Alert ID required", 400);

  if (action === "read") {
    await markAlertRead(id, ctx.organizationId);
    return ok({ success: true });
  }

  if (action === "dismiss") {
    await dismissAlert(id, ctx.organizationId);
    return ok({ success: true });
  }

  return err("Unknown action", 400);
});
