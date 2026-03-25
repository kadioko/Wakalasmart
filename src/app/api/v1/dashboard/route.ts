import { withAuth, ok, err } from "@server/lib/api-helpers";
import {
  getOwnerDashboard,
  getCashierDashboard,
  getDashboardTrends,
} from "@server/services/dashboard.service";

export const GET = withAuth(async (req, ctx) => {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "owner";

  if (ctx.role === "CASHIER") {
    const branchId = url.searchParams.get("branchId") || ctx.branchIds[0];
    if (!branchId) return err("Branch not found", 400);

    const data = await getCashierDashboard(ctx.organizationId, ctx.userId, branchId);
    return ok(data);
  }

  if (type === "trends") {
    const days = parseInt(url.searchParams.get("days") ?? "7");
    const data = await getDashboardTrends(ctx.organizationId, days);
    return ok(data);
  }

  const data = await getOwnerDashboard(ctx.organizationId);
  return ok(data);
});
