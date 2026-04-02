import test from "node:test";
import assert from "node:assert/strict";
import {
  buildExpenseReportWhere,
  buildTransactionReportWhere,
  getAccessibleBranchIds,
  normalizeReportDateRange,
} from "./report-filters";

test("normalizeReportDateRange expands to full-day boundaries", () => {
  const { start, end } = normalizeReportDateRange("2026-04-01", "2026-04-03");

  assert.equal(start.getFullYear(), 2026);
  assert.equal(start.getMonth(), 3);
  assert.equal(start.getDate(), 1);
  assert.equal(start.getHours(), 0);
  assert.equal(start.getMinutes(), 0);
  assert.equal(start.getSeconds(), 0);
  assert.equal(start.getMilliseconds(), 0);

  assert.equal(end.getFullYear(), 2026);
  assert.equal(end.getMonth(), 3);
  assert.equal(end.getDate(), 3);
  assert.equal(end.getHours(), 23);
  assert.equal(end.getMinutes(), 59);
  assert.equal(end.getSeconds(), 59);
  assert.equal(end.getMilliseconds(), 999);
});

test("getAccessibleBranchIds returns requested branch for owner-like roles", () => {
  const branchIds = getAccessibleBranchIds(
    {
      userId: "user_1",
      organizationId: "org_1",
      role: "OWNER",
      branchIds: ["branch_a"],
    },
    "branch_b"
  );

  assert.deepEqual(branchIds, ["branch_b"]);
});

test("getAccessibleBranchIds limits non-owner roles to assigned branches", () => {
  const branchIds = getAccessibleBranchIds({
    userId: "user_1",
    organizationId: "org_1",
    role: "CASHIER",
    branchIds: ["branch_a", "branch_b"],
  });

  assert.deepEqual(branchIds, ["branch_a", "branch_b"]);
});

test("getAccessibleBranchIds throws when a cashier requests an unassigned branch", () => {
  assert.throws(
    () =>
      getAccessibleBranchIds(
        {
          userId: "user_1",
          organizationId: "org_1",
          role: "CASHIER",
          branchIds: ["branch_a"],
        },
        "branch_b"
      ),
    /Access denied to this branch/
  );
});

test("buildTransactionReportWhere excludes reversals linked to original transactions", () => {
  const where = buildTransactionReportWhere({
    organizationId: "org_1",
    branchIds: ["branch_a"],
    startDate: new Date("2026-04-01T00:00:00.000Z"),
    endDate: new Date("2026-04-03T23:59:59.999Z"),
  });

  assert.deepEqual(where, {
    organizationId: "org_1",
    branchId: { in: ["branch_a"] },
    status: "COMPLETED",
    relatedTxId: null,
    transactedAt: {
      gte: new Date("2026-04-01T00:00:00.000Z"),
      lte: new Date("2026-04-03T23:59:59.999Z"),
    },
  });
});

test("buildExpenseReportWhere limits reports to approved non-deleted expenses", () => {
  const where = buildExpenseReportWhere({
    organizationId: "org_1",
    branchIds: ["branch_a"],
    startDate: new Date("2026-04-01T00:00:00.000Z"),
    endDate: new Date("2026-04-03T23:59:59.999Z"),
  });

  assert.equal(where.organizationId, "org_1");
  assert.deepEqual(where.branchId, { in: ["branch_a"] });
  assert.equal(where.status, "APPROVED");
  assert.equal(where.isDeleted, false);
  assert.deepEqual(where.paidAt, {
    gte: new Date("2026-04-01T00:00:00.000Z"),
    lte: new Date("2026-04-03T23:59:59.999Z"),
  });
});
