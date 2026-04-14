import test, { mock } from "node:test";
import assert from "node:assert/strict";

const fixedReceivedAt = new Date("2026-04-15T00:00:00.000Z");

function stubMethod(target: object, methodName: string, implementation: (...args: unknown[]) => unknown) {
  const original = (target as Record<string, unknown>)[methodName];
  const stub = mock.fn(implementation);
  (target as Record<string, unknown>)[methodName] = stub;
  return {
    stub,
    restore() {
      (target as Record<string, unknown>)[methodName] = original;
    },
  };
}

async function loadInboundSmsTestContext() {
  process.env.DATABASE_URL ??= "postgresql://postgres:postgres@127.0.0.1:5432/wakalasmart_test";

  const [dbModule, serviceModule] = (await Promise.all([
    import("@server/lib/db"),
    import("./inbound-sms.service"),
  ])) as unknown as [
    {
      db?: typeof import("@server/lib/db").db;
      default?: { db?: typeof import("@server/lib/db").db };
      "module.exports"?: { db?: typeof import("@server/lib/db").db };
    },
    {
      ingestInboundSms?: typeof import("./inbound-sms.service").ingestInboundSms;
      reviewInboundSms?: typeof import("./inbound-sms.service").reviewInboundSms;
      recordReviewedInboundSms?: typeof import("./inbound-sms.service").recordReviewedInboundSms;
      ignoreInboundSms?: typeof import("./inbound-sms.service").ignoreInboundSms;
      processInboundSmsAction?: typeof import("./inbound-sms.service").processInboundSmsAction;
      getInboundSmsList?: typeof import("./inbound-sms.service").getInboundSmsList;
      getInboundSmsById?: typeof import("./inbound-sms.service").getInboundSmsById;
      default?: {
        ingestInboundSms?: typeof import("./inbound-sms.service").ingestInboundSms;
        reviewInboundSms?: typeof import("./inbound-sms.service").reviewInboundSms;
        recordReviewedInboundSms?: typeof import("./inbound-sms.service").recordReviewedInboundSms;
        ignoreInboundSms?: typeof import("./inbound-sms.service").ignoreInboundSms;
        processInboundSmsAction?: typeof import("./inbound-sms.service").processInboundSmsAction;
        getInboundSmsList?: typeof import("./inbound-sms.service").getInboundSmsList;
        getInboundSmsById?: typeof import("./inbound-sms.service").getInboundSmsById;
      };
      "module.exports"?: {
        ingestInboundSms?: typeof import("./inbound-sms.service").ingestInboundSms;
        reviewInboundSms?: typeof import("./inbound-sms.service").reviewInboundSms;
        recordReviewedInboundSms?: typeof import("./inbound-sms.service").recordReviewedInboundSms;
        ignoreInboundSms?: typeof import("./inbound-sms.service").ignoreInboundSms;
        processInboundSmsAction?: typeof import("./inbound-sms.service").processInboundSmsAction;
        getInboundSmsList?: typeof import("./inbound-sms.service").getInboundSmsList;
        getInboundSmsById?: typeof import("./inbound-sms.service").getInboundSmsById;
      };
    },
  ];

  const dbExports = (dbModule.default ?? dbModule["module.exports"] ?? dbModule) as {
    db: typeof import("@server/lib/db").db;
  };
  const serviceExports =
    (serviceModule.default ?? serviceModule["module.exports"] ?? serviceModule) as {
      ingestInboundSms: typeof import("./inbound-sms.service").ingestInboundSms;
      reviewInboundSms: typeof import("./inbound-sms.service").reviewInboundSms;
      recordReviewedInboundSms: typeof import("./inbound-sms.service").recordReviewedInboundSms;
      ignoreInboundSms: typeof import("./inbound-sms.service").ignoreInboundSms;
      processInboundSmsAction: typeof import("./inbound-sms.service").processInboundSmsAction;
      getInboundSmsList: typeof import("./inbound-sms.service").getInboundSmsList;
      getInboundSmsById: typeof import("./inbound-sms.service").getInboundSmsById;
    };

  return {
    db: dbExports.db,
    ingestInboundSms: serviceExports.ingestInboundSms,
    reviewInboundSms: serviceExports.reviewInboundSms,
    recordReviewedInboundSms: serviceExports.recordReviewedInboundSms,
    ignoreInboundSms: serviceExports.ignoreInboundSms,
    processInboundSmsAction: serviceExports.processInboundSmsAction,
    getInboundSmsList: serviceExports.getInboundSmsList,
    getInboundSmsById: serviceExports.getInboundSmsById,
  };
}

test("ingestInboundSms persists parsed SMS fields and writes SMS_INGESTED audit log for actionable SMS", async (t) => {
  const { db, ingestInboundSms } = await loadInboundSmsTestContext();

  const findUniqueMock = stubMethod(db.inboundSms, "findUnique", async () => null);
  const createMock = stubMethod(db.inboundSms, "create", async (args: unknown) => {
    const input = args as {
      data: {
        organizationId: string;
        branchId: string | null;
        source: string;
        provider: string;
        status: string;
        sender: string | null;
        message: string;
        parseConfidence: number;
        parseError: string | null;
        parsedType?: string;
        parsedAmount?: number;
        parsedReference?: string | null;
        parsedExternalRef?: string | null;
        parsedCustomerPhone?: string | null;
        parsedData: { warnings?: string[] };
        submittedById: string;
        failedAt: Date | null;
      };
    };

    return {
      id: "sms_1",
      organizationId: input.data.organizationId,
      branchId: input.data.branchId,
      source: input.data.source,
      provider: input.data.provider,
      status: input.data.status,
      sender: input.data.sender,
      message: input.data.message,
      parseConfidence: input.data.parseConfidence,
      parseError: input.data.parseError,
      parsedType: input.data.parsedType,
      parsedAmount: input.data.parsedAmount,
      parsedReference: input.data.parsedReference,
      parsedExternalRef: input.data.parsedExternalRef,
      parsedCustomerPhone: input.data.parsedCustomerPhone,
      parsedData: input.data.parsedData,
      submittedById: input.data.submittedById,
      failedAt: input.data.failedAt,
      branch: null,
      transaction: null,
    };
  });
  const auditCreateMock = stubMethod(db.auditLog, "create", async () => ({ id: "audit_1" }));
  t.after(() => {
    findUniqueMock.restore();
    createMock.restore();
    auditCreateMock.restore();
    mock.restoreAll();
  });

  const sms = await ingestInboundSms(
    {
      source: "MANUAL_INBOX",
      branchId: "branch_1",
      sender: "M-Pesa",
      message:
        "QJH7K2LMN8 Confirmed. Umepokea TZS 45,000 kutoka 0712345678. Salio lako ni TZS 120,000. M-Pesa Wakala.",
      receivedAt: fixedReceivedAt,
      providerHint: "MPESA",
    },
    {
      organizationId: "org_1",
      userId: "user_1",
      ipAddress: "127.0.0.1",
      userAgent: "node-test",
    }
  );

  assert.equal(findUniqueMock.stub.mock.callCount(), 1);
  assert.equal(createMock.stub.mock.callCount(), 1);
  assert.equal(auditCreateMock.stub.mock.callCount(), 1);

  const createArgs = createMock.stub.mock.calls[0].arguments[0] as {
    data: {
      provider: string;
      status: string;
      parsedType?: string;
      parsedAmount?: number;
      parsedReference?: string | null;
      parsedCustomerPhone?: string | null;
      parseError: string | null;
      failedAt: Date | null;
      parsedData: { warnings?: string[] };
    };
  };

  assert.equal(createArgs.data.provider, "MPESA");
  assert.equal(createArgs.data.status, "PARSED");
  assert.equal(createArgs.data.parsedType, "DEPOSIT");
  assert.equal(createArgs.data.parsedAmount, 45000);
  assert.equal(createArgs.data.parsedReference, "QJH7K2LMN8");
  assert.equal(createArgs.data.parsedCustomerPhone, "0712345678");
  assert.equal(createArgs.data.parseError, null);
  assert.equal(createArgs.data.failedAt, null);
  assert.deepEqual(createArgs.data.parsedData.warnings ?? [], []);

  const auditArgs = auditCreateMock.stub.mock.calls[0].arguments[0] as {
    data: {
      action: string;
      resourceType: string;
      resourceId: string;
      description: string;
      after: { provider: string; status: string; branchId: string | null };
    };
  };

  assert.equal(auditArgs.data.action, "SMS_INGESTED");
  assert.equal(auditArgs.data.resourceType, "inbound_sms");
  assert.equal(auditArgs.data.resourceId, "sms_1");
  assert.equal(auditArgs.data.description, "Inbound SMS ingested via MANUAL_INBOX");
  assert.deepEqual(auditArgs.data.after, {
    provider: "MPESA",
    status: "PARSED",
    branchId: "branch_1",
  });

  assert.equal(sms.status, "PARSED");
  assert.equal(sms.provider, "MPESA");
});

test("ingestInboundSms stores failed parse status and warning-bearing parsedData for non-actionable SMS", async (t) => {
  const { db, ingestInboundSms } = await loadInboundSmsTestContext();

  const findUniqueMock = stubMethod(db.inboundSms, "findUnique", async () => null);
  const createMock = stubMethod(db.inboundSms, "create", async (args: unknown) => {
    const input = args as {
      data: {
        provider: string;
        status: string;
        parseError: string | null;
        failedAt: Date | null;
        parsedData: { warnings?: string[] };
      };
    };

    return {
      id: "sms_failed_1",
      provider: input.data.provider,
      status: input.data.status,
      parseError: input.data.parseError,
      failedAt: input.data.failedAt,
      parsedData: input.data.parsedData,
      branch: null,
      transaction: null,
    };
  });
  const auditCreateMock = stubMethod(db.auditLog, "create", async () => ({ id: "audit_2" }));
  t.after(() => {
    findUniqueMock.restore();
    createMock.restore();
    auditCreateMock.restore();
    mock.restoreAll();
  });

  await ingestInboundSms(
    {
      source: "SMS_WEBHOOK",
      sender: "CRDB Alerts",
      message: "CRDB warning: never share your PIN or OTP with anyone. Fraud alert for all agents.",
      receivedAt: fixedReceivedAt,
      providerHint: "CRDB_BANK",
    },
    {
      organizationId: "org_1",
      userId: "user_1",
    }
  );

  assert.equal(findUniqueMock.stub.mock.callCount(), 1);
  assert.equal(createMock.stub.mock.callCount(), 1);
  assert.equal(auditCreateMock.stub.mock.callCount(), 1);

  const createArgs = createMock.stub.mock.calls[0].arguments[0] as {
    data: {
      provider: string;
      status: string;
      parseError: string | null;
      failedAt: Date | null;
      parsedType?: string;
      parsedData: { warnings?: string[] };
    };
  };

  assert.equal(createArgs.data.provider, "CRDB_BANK");
  assert.equal(createArgs.data.status, "FAILED");
  assert.equal(createArgs.data.parsedType, undefined);
  assert.equal(
    createArgs.data.parseError,
    "Could not confidently determine provider, type, and amount from the SMS"
  );
  assert.ok(createArgs.data.failedAt instanceof Date);
  assert.ok(
    (createArgs.data.parsedData.warnings ?? []).some((warning) =>
      warning.includes("provider warning or informational notice")
    )
  );
});

test("reviewInboundSms normalizes review fields, updates status, and writes SMS_REVIEWED audit payload", async (t) => {
  const { db, reviewInboundSms } = await loadInboundSmsTestContext();

  const findFirstMock = stubMethod(db.inboundSms, "findFirst", async () => ({
    id: "sms_review_1",
    organizationId: "org_1",
    status: "FAILED",
    reviewNotes: null,
    linkedTransactionId: null,
    parsedExternalRef: null,
    reviewedAt: null,
    branch: null,
    submittedBy: null,
    reviewedBy: null,
    transaction: null,
  }));
  const branchFindFirstMock = stubMethod(db.branch, "findFirst", async () => ({ id: "branch_1", name: "Main" }));
  const tillFindFirstMock = stubMethod(db.till, "findFirst", async () => ({ id: "till_1", branchId: "branch_1" }));
  const providerFindFirstMock = stubMethod(db.provider, "findFirst", async () => ({ id: "provider_1", organizationId: "org_1" }));

  const updateMock = stubMethod(db.inboundSms, "update", async (args: unknown) => {
    const input = args as {
      data: {
        branchId: string;
        parsedTillId: string;
        parsedProviderId: string | null;
        parsedType: string;
        parsedAmount: number;
        parsedReference: string | null;
        parsedExternalRef: string | null;
        parsedCustomerPhone: string | null;
        reviewNotes: string | null;
        status: string;
        parseError: string | null;
      };
    };

    return {
      id: "sms_review_1",
      branchId: input.data.branchId,
      parsedTillId: input.data.parsedTillId,
      parsedProviderId: input.data.parsedProviderId,
      parsedType: input.data.parsedType,
      parsedAmount: input.data.parsedAmount,
      parsedReference: input.data.parsedReference,
      parsedExternalRef: input.data.parsedExternalRef,
      parsedCustomerPhone: input.data.parsedCustomerPhone,
      reviewNotes: input.data.reviewNotes,
      status: input.data.status,
      parseError: input.data.parseError,
      branch: { id: "branch_1", name: "Main" },
      transaction: null,
    };
  });
  const auditCreateMock = stubMethod(db.auditLog, "create", async () => ({ id: "audit_3" }));
  t.after(() => {
    findFirstMock.restore();
    branchFindFirstMock.restore();
    tillFindFirstMock.restore();
    providerFindFirstMock.restore();
    updateMock.restore();
    auditCreateMock.restore();
    mock.restoreAll();
  });

  const reviewed = await reviewInboundSms(
    "sms_review_1",
    {
      branchId: "branch_1",
      tillId: "till_1",
      providerId: "provider_1",
      type: "DEPOSIT",
      amount: 45000,
      reference: "QJH7K2LMN8",
      externalRef: "EXT-QJH7K2LMN8",
      customerPhone: "+255712345678",
      notes: "Reviewed from parser result",
    },
    {
      organizationId: "org_1",
      userId: "user_1",
      ipAddress: "127.0.0.1",
      userAgent: "node-test",
    }
  );

  assert.equal(findFirstMock.stub.mock.callCount(), 1);
  assert.equal(branchFindFirstMock.stub.mock.callCount(), 1);
  assert.equal(tillFindFirstMock.stub.mock.callCount(), 1);
  assert.equal(providerFindFirstMock.stub.mock.callCount(), 1);
  assert.equal(updateMock.stub.mock.callCount(), 1);
  assert.equal(auditCreateMock.stub.mock.callCount(), 1);

  const updateArgs = updateMock.stub.mock.calls[0].arguments[0] as {
    data: {
      parsedCustomerPhone: string | null;
      status: string;
      parseError: string | null;
      parsedProviderId: string | null;
      parsedTillId: string;
      parsedType: string;
      parsedAmount: number;
    };
  };

  assert.equal(updateArgs.data.parsedCustomerPhone, "0712345678");
  assert.equal(updateArgs.data.status, "REVIEWED");
  assert.equal(updateArgs.data.parseError, null);
  assert.equal(updateArgs.data.parsedProviderId, "provider_1");
  assert.equal(updateArgs.data.parsedTillId, "till_1");
  assert.equal(updateArgs.data.parsedType, "DEPOSIT");
  assert.equal(updateArgs.data.parsedAmount, 45000);

  const auditArgs = auditCreateMock.stub.mock.calls[0].arguments[0] as unknown as {
    data: {
      action: string;
      resourceId: string;
      after: {
        branchId: string;
        tillId: string;
        providerId: string | null;
        type: string;
        amount: number;
      };
    };
  };

  assert.equal(auditArgs.data.action, "SMS_REVIEWED");
  assert.equal(auditArgs.data.resourceId, "sms_review_1");
  assert.deepEqual(auditArgs.data.after, {
    branchId: "branch_1",
    tillId: "till_1",
    providerId: "provider_1",
    type: "DEPOSIT",
    amount: 45000,
  });

  assert.equal(reviewed.status, "REVIEWED");
  assert.equal(reviewed.parsedCustomerPhone, "0712345678");
});

test("ignoreInboundSms sets IGNORED status, records reason, and writes SMS_IGNORED audit log", async (t) => {
  const { db, ignoreInboundSms } = await loadInboundSmsTestContext();

  const findFirstMock = stubMethod(db.inboundSms, "findFirst", async () => ({
    id: "sms_ignore_1",
    organizationId: "org_1",
    status: "FAILED",
    reviewNotes: null,
    linkedTransactionId: null,
    parsedExternalRef: null,
    reviewedAt: null,
    branch: null,
    submittedBy: null,
    reviewedBy: null,
    transaction: null,
  }));

  const updateMock = stubMethod(db.inboundSms, "update", async (args: unknown) => {
    const input = args as { data: { status: string; reviewNotes: string | null; ignoredAt: Date } };
    return {
      id: "sms_ignore_1",
      status: input.data.status,
      reviewNotes: input.data.reviewNotes,
      ignoredAt: input.data.ignoredAt,
    };
  });

  const auditCreateMock = stubMethod(db.auditLog, "create", async () => ({ id: "audit_ignore_1" }));

  t.after(() => {
    findFirstMock.restore();
    updateMock.restore();
    auditCreateMock.restore();
    mock.restoreAll();
  });

  const result = await ignoreInboundSms("sms_ignore_1", "Duplicate notification", {
    organizationId: "org_1",
    userId: "user_1",
    ipAddress: "127.0.0.1",
    userAgent: "node-test",
  });

  assert.equal(findFirstMock.stub.mock.callCount(), 1);
  assert.equal(updateMock.stub.mock.callCount(), 1);
  assert.equal(auditCreateMock.stub.mock.callCount(), 1);

  const updateArgs = updateMock.stub.mock.calls[0].arguments[0] as {
    data: { status: string; reviewNotes: string | null; ignoredAt: Date };
  };
  assert.equal(updateArgs.data.status, "IGNORED");
  assert.equal(updateArgs.data.reviewNotes, "Duplicate notification");
  assert.ok(updateArgs.data.ignoredAt instanceof Date);

  const auditArgs = auditCreateMock.stub.mock.calls[0].arguments[0] as {
    data: { action: string; resourceType: string; resourceId: string; description: string };
  };
  assert.equal(auditArgs.data.action, "SMS_IGNORED");
  assert.equal(auditArgs.data.resourceType, "inbound_sms");
  assert.equal(auditArgs.data.resourceId, "sms_ignore_1");
  assert.ok(auditArgs.data.description.includes("Duplicate notification"));

  assert.equal(result.status, "IGNORED");
  assert.equal(result.reviewNotes, "Duplicate notification");
});

test("recordReviewedInboundSms creates linked transaction, propagates notes, sets RECORDED status, and writes SMS_RECORDED audit log", async (t) => {
  const { db, recordReviewedInboundSms } = await loadInboundSmsTestContext();

  // SMS in REVIEWED state, not yet linked
  const findFirstMock = stubMethod(db.inboundSms, "findFirst", async () => ({
    id: "sms_rec_1",
    organizationId: "org_1",
    status: "REVIEWED",
    reviewNotes: null,
    linkedTransactionId: null,
    parsedExternalRef: null,
    reviewedAt: null,
    branch: null,
    submittedBy: null,
    reviewedBy: null,
    transaction: null,
  }));

  const branchFindFirstMock = stubMethod(db.branch, "findFirst", async () => ({
    id: "branch_1",
    name: "Main",
  }));

  // FLOAT_ACCOUNT with no provider → DEPOSIT bypasses both ledger entry paths
  const tillFindFirstMock = stubMethod(db.till, "findFirst", async () => ({
    id: "till_1",
    branchId: "branch_1",
    type: "FLOAT_ACCOUNT",
  }));

  // No org settings → no mandatory shift, no duplicate-reference block
  const orgSettingsMock = stubMethod(db.organizationSettings, "findUnique", async () => null);

  // No active shift → shiftId will be undefined on the transaction
  const shiftFindFirstMock = stubMethod(db.shift, "findFirst", async () => null);

  // Capture what createTransaction sends to tx.transaction.create
  const txTransactionCreateMock = mock.fn(async () => ({
    id: "txn_1",
    organizationId: "org_1",
    branchId: "branch_1",
    tillId: "till_1",
    providerId: null,
    type: "DEPOSIT",
    amount: 45000,
    status: "COMPLETED",
    reference: null,
    externalRef: null,
    transactedAt: new Date(),
  }));

  const dbTransactionMock = stubMethod(db, "$transaction", async (...args: unknown[]) => {
    const callback = args[0] as (tx: unknown) => Promise<unknown>;
    return callback({ transaction: { create: txTransactionCreateMock } });
  });

  // update is called twice: first by reviewInboundSms, then by recordReviewedInboundSms
  let updateCallCount = 0;
  const updateMock = stubMethod(db.inboundSms, "update", async (args: unknown) => {
    updateCallCount++;
    const input = args as { data: Record<string, unknown> };
    if (updateCallCount === 1) {
      return {
        id: "sms_rec_1",
        status: "REVIEWED",
        linkedTransactionId: null,
        parsedExternalRef: null,
        reviewedAt: new Date(),
        branchId: "branch_1",
        parsedTillId: "till_1",
        parsedProviderId: null,
        parsedType: "DEPOSIT",
        parsedAmount: 45000,
        parsedReference: null,
        parsedCustomerPhone: null,
        reviewNotes: (input.data.reviewNotes as string | null) ?? null,
        parseError: null,
        branch: { id: "branch_1", name: "Main" },
        transaction: null,
      };
    }
    return {
      id: "sms_rec_1",
      status: "RECORDED",
      linkedTransactionId: "txn_1",
      branch: { id: "branch_1", name: "Main" },
      transaction: { id: "txn_1", type: "DEPOSIT", amount: 45000, status: "COMPLETED", reference: null },
    };
  });

  // auditLog.create is called 3×: SMS_REVIEWED (reviewInboundSms),
  // TRANSACTION_CREATED (createTransaction), SMS_RECORDED (recordReviewedInboundSms)
  const auditCreateMock = stubMethod(db.auditLog, "create", async () => ({ id: "audit_rec" }));

  t.after(() => {
    findFirstMock.restore();
    branchFindFirstMock.restore();
    tillFindFirstMock.restore();
    orgSettingsMock.restore();
    shiftFindFirstMock.restore();
    dbTransactionMock.restore();
    updateMock.restore();
    auditCreateMock.restore();
    mock.restoreAll();
  });

  const result = await recordReviewedInboundSms(
    "sms_rec_1",
    {
      branchId: "branch_1",
      tillId: "till_1",
      type: "DEPOSIT",
      amount: 45000,
      notes: "Manual review",
    },
    {
      organizationId: "org_1",
      userId: "user_1",
      ipAddress: "127.0.0.1",
      userAgent: "node-test",
    }
  );

  // Two db.inboundSms.update calls: REVIEWED then RECORDED
  assert.equal(updateCallCount, 2);

  const recordedUpdateArgs = updateMock.stub.mock.calls[1].arguments[0] as {
    data: { status: string; linkedTransactionId: string; recordedAt: Date };
  };
  assert.equal(recordedUpdateArgs.data.status, "RECORDED");
  assert.equal(recordedUpdateArgs.data.linkedTransactionId, "txn_1");
  assert.ok(recordedUpdateArgs.data.recordedAt instanceof Date);

  // Transaction notes must carry payload.notes and the SMS import marker
  assert.equal(txTransactionCreateMock.mock.callCount(), 1);
  const txCreateArgs = txTransactionCreateMock.mock.calls[0]!.arguments[0] as unknown as {
    data: { type: string; amount: number; notes: string };
  };
  assert.equal(txCreateArgs.data.type, "DEPOSIT");
  assert.equal(txCreateArgs.data.amount, 45000);
  assert.ok(txCreateArgs.data.notes.includes("Manual review"));
  assert.ok(txCreateArgs.data.notes.includes("Imported from SMS sms_rec_1"));

  // Third audit call is SMS_RECORDED
  const smsRecordedAudit = auditCreateMock.stub.mock.calls[2].arguments[0] as {
    data: { action: string; resourceId: string; after: { transactionId: string; type: string; amount: number } };
  };
  assert.equal(smsRecordedAudit.data.action, "SMS_RECORDED");
  assert.equal(smsRecordedAudit.data.resourceId, "sms_rec_1");
  assert.equal(smsRecordedAudit.data.after.transactionId, "txn_1");
  assert.equal(smsRecordedAudit.data.after.type, "DEPOSIT");
  assert.equal(smsRecordedAudit.data.after.amount, 45000);

  // Return value reflects RECORDED state with linked transaction
  assert.equal(result.status, "RECORDED");
  assert.equal(result.linkedTransactionId, "txn_1");
  assert.ok(result.transaction != null);
  assert.equal(result.transaction!.id, "txn_1");
});

// ---------------------------------------------------------------------------
// Duplicate fingerprint short-circuit
// ---------------------------------------------------------------------------

test("ingestInboundSms returns existing record without creating or auditing when fingerprint already exists", async (t) => {
  const { db, ingestInboundSms } = await loadInboundSmsTestContext();

  const existingRecord = {
    id: "sms_existing",
    organizationId: "org_1",
    status: "PARSED",
    provider: "MPESA",
    source: "MANUAL_INBOX",
    sender: "M-Pesa",
    message: "QJH7K2LMN8 Confirmed. Umepokea TZS 45,000 kutoka 0712345678.",
    branch: null,
    transaction: null,
  };

  const findUniqueMock = stubMethod(db.inboundSms, "findUnique", async () => existingRecord);
  const createMock = stubMethod(db.inboundSms, "create", async () => {
    throw new Error("create should not be called for a duplicate");
  });
  const auditCreateMock = stubMethod(db.auditLog, "create", async () => {
    throw new Error("audit should not be called for a duplicate");
  });

  t.after(() => {
    findUniqueMock.restore();
    createMock.restore();
    auditCreateMock.restore();
    mock.restoreAll();
  });

  const result = await ingestInboundSms(
    {
      source: "MANUAL_INBOX",
      branchId: "branch_1",
      sender: "M-Pesa",
      message: "QJH7K2LMN8 Confirmed. Umepokea TZS 45,000 kutoka 0712345678.",
      receivedAt: fixedReceivedAt,
      providerHint: "MPESA",
    },
    { organizationId: "org_1", userId: "user_1" }
  );

  assert.equal(findUniqueMock.stub.mock.callCount(), 1);
  assert.equal(createMock.stub.mock.callCount(), 0);
  assert.equal(auditCreateMock.stub.mock.callCount(), 0);
  assert.equal(result.id, "sms_existing");
  assert.equal(result.status, "PARSED");
});

// ---------------------------------------------------------------------------
// Behavioral edge cases
// ---------------------------------------------------------------------------

test("ignoreInboundSms falls back to existing reviewNotes when no reason is provided", async (t) => {
  const { db, ignoreInboundSms } = await loadInboundSmsTestContext();

  const findFirstMock = stubMethod(db.inboundSms, "findFirst", async () => ({
    id: "sms_1",
    organizationId: "org_1",
    status: "PARSED",
    reviewNotes: "Prior reviewer note",
    linkedTransactionId: null,
    branch: null,
    submittedBy: null,
    reviewedBy: null,
    transaction: null,
  }));

  const updateMock = stubMethod(db.inboundSms, "update", async (args: unknown) => {
    const input = args as { data: { reviewNotes: string | null } };
    return { id: "sms_1", status: "IGNORED", reviewNotes: input.data.reviewNotes };
  });

  const auditCreateMock = stubMethod(db.auditLog, "create", async () => ({ id: "audit_1" }));

  t.after(() => {
    findFirstMock.restore();
    updateMock.restore();
    auditCreateMock.restore();
    mock.restoreAll();
  });

  const result = await ignoreInboundSms("sms_1", undefined, {
    organizationId: "org_1",
    userId: "user_1",
  });

  const updateArgs = updateMock.stub.mock.calls[0].arguments[0] as {
    data: { reviewNotes: string | null };
  };
  assert.equal(updateArgs.data.reviewNotes, "Prior reviewer note");
  assert.equal(result.reviewNotes, "Prior reviewer note");
});

test("recordReviewedInboundSms uses sms.parsedExternalRef for the transaction when payload has no externalRef", async (t) => {
  const { db, recordReviewedInboundSms } = await loadInboundSmsTestContext();

  const findFirstMock = stubMethod(db.inboundSms, "findFirst", async () => ({
    id: "sms_rec_2",
    organizationId: "org_1",
    status: "REVIEWED",
    reviewNotes: null,
    linkedTransactionId: null,
    parsedExternalRef: null,
    reviewedAt: null,
    branch: null,
    submittedBy: null,
    reviewedBy: null,
    transaction: null,
  }));

  const branchFindFirstMock = stubMethod(db.branch, "findFirst", async () => ({ id: "branch_1", name: "Main" }));
  const tillFindFirstMock = stubMethod(db.till, "findFirst", async () => ({
    id: "till_1",
    branchId: "branch_1",
    type: "FLOAT_ACCOUNT",
  }));
  const orgSettingsMock = stubMethod(db.organizationSettings, "findUnique", async () => null);
  const shiftFindFirstMock = stubMethod(db.shift, "findFirst", async () => null);

  const txTransactionCreateMock = mock.fn(async () => ({
    id: "txn_2",
    organizationId: "org_1",
    branchId: "branch_1",
    tillId: "till_1",
    providerId: null,
    type: "DEPOSIT",
    amount: 20000,
    status: "COMPLETED",
    reference: null,
    externalRef: "EXT-FROM-SMS",
    transactedAt: new Date(),
  }));

  const dbTransactionMock = stubMethod(db, "$transaction", async (...args: unknown[]) => {
    const callback = args[0] as (tx: unknown) => Promise<unknown>;
    return callback({ transaction: { create: txTransactionCreateMock } });
  });

  let updateCallCount = 0;
  const updateMock = stubMethod(db.inboundSms, "update", async () => {
    updateCallCount++;
    if (updateCallCount === 1) {
      // reviewInboundSms update — SMS carries a parsedExternalRef from the original parse
      return {
        id: "sms_rec_2",
        status: "REVIEWED",
        linkedTransactionId: null,
        parsedExternalRef: "EXT-FROM-SMS",
        reviewedAt: new Date(),
        branch: null,
        transaction: null,
      };
    }
    return {
      id: "sms_rec_2",
      status: "RECORDED",
      linkedTransactionId: "txn_2",
      branch: null,
      transaction: { id: "txn_2", type: "DEPOSIT", amount: 20000, status: "COMPLETED", reference: null },
    };
  });

  const auditCreateMock = stubMethod(db.auditLog, "create", async () => ({ id: "audit_1" }));

  t.after(() => {
    findFirstMock.restore();
    branchFindFirstMock.restore();
    tillFindFirstMock.restore();
    orgSettingsMock.restore();
    shiftFindFirstMock.restore();
    dbTransactionMock.restore();
    updateMock.restore();
    auditCreateMock.restore();
    mock.restoreAll();
  });

  await recordReviewedInboundSms(
    "sms_rec_2",
    // no externalRef in payload
    { branchId: "branch_1", tillId: "till_1", type: "DEPOSIT", amount: 20000 },
    { organizationId: "org_1", userId: "user_1" }
  );

  assert.equal(txTransactionCreateMock.mock.callCount(), 1);
  const txCreateArgs = txTransactionCreateMock.mock.calls[0]!.arguments[0] as unknown as {
    data: { externalRef: string | undefined };
  };
  assert.equal(txCreateArgs.data.externalRef, "EXT-FROM-SMS");
});

// ---------------------------------------------------------------------------
// Guard rails — error throws
// ---------------------------------------------------------------------------

test("reviewInboundSms throws if SMS is already RECORDED", async (t) => {
  const { db, reviewInboundSms } = await loadInboundSmsTestContext();

  const findFirstMock = stubMethod(db.inboundSms, "findFirst", async () => ({
    id: "sms_1",
    organizationId: "org_1",
    status: "RECORDED",
    branch: null,
    submittedBy: null,
    reviewedBy: null,
    transaction: null,
  }));

  t.after(() => {
    findFirstMock.restore();
    mock.restoreAll();
  });

  await assert.rejects(
    () =>
      reviewInboundSms(
        "sms_1",
        { branchId: "branch_1", tillId: "till_1", type: "DEPOSIT", amount: 1000 },
        { organizationId: "org_1", userId: "user_1" }
      ),
    /Recorded SMS cannot be reviewed again/
  );
});

test("ignoreInboundSms throws if SMS is already RECORDED", async (t) => {
  const { db, ignoreInboundSms } = await loadInboundSmsTestContext();

  const findFirstMock = stubMethod(db.inboundSms, "findFirst", async () => ({
    id: "sms_1",
    organizationId: "org_1",
    status: "RECORDED",
    branch: null,
    submittedBy: null,
    reviewedBy: null,
    transaction: null,
  }));

  t.after(() => {
    findFirstMock.restore();
    mock.restoreAll();
  });

  await assert.rejects(
    () => ignoreInboundSms("sms_1", "spam", { organizationId: "org_1", userId: "user_1" }),
    /Recorded SMS cannot be ignored/
  );
});

test("recordReviewedInboundSms throws if SMS is already linked to a transaction", async (t) => {
  const { db, recordReviewedInboundSms } = await loadInboundSmsTestContext();

  // SMS is REVIEWED (not RECORDED), so reviewInboundSms won't throw —
  // but the update mock returns linkedTransactionId already set, which triggers the guard.
  const findFirstMock = stubMethod(db.inboundSms, "findFirst", async () => ({
    id: "sms_1",
    organizationId: "org_1",
    status: "REVIEWED",
    reviewNotes: null,
    linkedTransactionId: null,
    parsedExternalRef: null,
    reviewedAt: null,
    branch: null,
    submittedBy: null,
    reviewedBy: null,
    transaction: null,
  }));
  const branchFindFirstMock = stubMethod(db.branch, "findFirst", async () => ({ id: "branch_1", name: "Main" }));
  const tillFindFirstMock = stubMethod(db.till, "findFirst", async () => ({ id: "till_1", branchId: "branch_1" }));
  const updateMock = stubMethod(db.inboundSms, "update", async () => ({
    id: "sms_1",
    status: "REVIEWED",
    linkedTransactionId: "existing_txn",
    parsedExternalRef: null,
    reviewedAt: new Date(),
    branch: null,
    transaction: null,
  }));
  const auditCreateMock = stubMethod(db.auditLog, "create", async () => ({ id: "audit_1" }));

  t.after(() => {
    findFirstMock.restore();
    branchFindFirstMock.restore();
    tillFindFirstMock.restore();
    updateMock.restore();
    auditCreateMock.restore();
    mock.restoreAll();
  });

  await assert.rejects(
    () =>
      recordReviewedInboundSms(
        "sms_1",
        { branchId: "branch_1", tillId: "till_1", type: "DEPOSIT", amount: 1000 },
        { organizationId: "org_1", userId: "user_1" }
      ),
    /already linked to a transaction/
  );
});

test("reviewInboundSms throws if branch is not found", async (t) => {
  const { db, reviewInboundSms } = await loadInboundSmsTestContext();

  const findFirstMock = stubMethod(db.inboundSms, "findFirst", async () => ({
    id: "sms_1",
    organizationId: "org_1",
    status: "FAILED",
    branch: null,
    submittedBy: null,
    reviewedBy: null,
    transaction: null,
  }));
  const branchFindFirstMock = stubMethod(db.branch, "findFirst", async () => null);
  const tillFindFirstMock = stubMethod(db.till, "findFirst", async () => ({ id: "till_1", branchId: "branch_1" }));

  t.after(() => {
    findFirstMock.restore();
    branchFindFirstMock.restore();
    tillFindFirstMock.restore();
    mock.restoreAll();
  });

  await assert.rejects(
    () =>
      reviewInboundSms(
        "sms_1",
        { branchId: "branch_1", tillId: "till_1", type: "DEPOSIT", amount: 1000 },
        { organizationId: "org_1", userId: "user_1" }
      ),
    /Branch not found/
  );
});

test("reviewInboundSms throws if till is not found", async (t) => {
  const { db, reviewInboundSms } = await loadInboundSmsTestContext();

  const findFirstMock = stubMethod(db.inboundSms, "findFirst", async () => ({
    id: "sms_1",
    organizationId: "org_1",
    status: "FAILED",
    branch: null,
    submittedBy: null,
    reviewedBy: null,
    transaction: null,
  }));
  const branchFindFirstMock = stubMethod(db.branch, "findFirst", async () => ({ id: "branch_1", name: "Main" }));
  const tillFindFirstMock = stubMethod(db.till, "findFirst", async () => null);

  t.after(() => {
    findFirstMock.restore();
    branchFindFirstMock.restore();
    tillFindFirstMock.restore();
    mock.restoreAll();
  });

  await assert.rejects(
    () =>
      reviewInboundSms(
        "sms_1",
        { branchId: "branch_1", tillId: "till_1", type: "DEPOSIT", amount: 1000 },
        { organizationId: "org_1", userId: "user_1" }
      ),
    /Till not found/
  );
});

test("reviewInboundSms throws if till does not belong to the selected branch", async (t) => {
  const { db, reviewInboundSms } = await loadInboundSmsTestContext();

  const findFirstMock = stubMethod(db.inboundSms, "findFirst", async () => ({
    id: "sms_1",
    organizationId: "org_1",
    status: "FAILED",
    branch: null,
    submittedBy: null,
    reviewedBy: null,
    transaction: null,
  }));
  const branchFindFirstMock = stubMethod(db.branch, "findFirst", async () => ({ id: "branch_1", name: "Main" }));
  // Till belongs to a different branch
  const tillFindFirstMock = stubMethod(db.till, "findFirst", async () => ({
    id: "till_1",
    branchId: "branch_other",
  }));

  t.after(() => {
    findFirstMock.restore();
    branchFindFirstMock.restore();
    tillFindFirstMock.restore();
    mock.restoreAll();
  });

  await assert.rejects(
    () =>
      reviewInboundSms(
        "sms_1",
        { branchId: "branch_1", tillId: "till_1", type: "DEPOSIT", amount: 1000 },
        { organizationId: "org_1", userId: "user_1" }
      ),
    /Till does not belong to the selected branch/
  );
});

test("reviewInboundSms throws if provider is not found", async (t) => {
  const { db, reviewInboundSms } = await loadInboundSmsTestContext();

  const findFirstMock = stubMethod(db.inboundSms, "findFirst", async () => ({
    id: "sms_1",
    organizationId: "org_1",
    status: "FAILED",
    branch: null,
    submittedBy: null,
    reviewedBy: null,
    transaction: null,
  }));
  const branchFindFirstMock = stubMethod(db.branch, "findFirst", async () => ({ id: "branch_1", name: "Main" }));
  const tillFindFirstMock = stubMethod(db.till, "findFirst", async () => ({ id: "till_1", branchId: "branch_1" }));
  const providerFindFirstMock = stubMethod(db.provider, "findFirst", async () => null);

  t.after(() => {
    findFirstMock.restore();
    branchFindFirstMock.restore();
    tillFindFirstMock.restore();
    providerFindFirstMock.restore();
    mock.restoreAll();
  });

  await assert.rejects(
    () =>
      reviewInboundSms(
        "sms_1",
        { branchId: "branch_1", tillId: "till_1", providerId: "provider_1", type: "DEPOSIT", amount: 1000 },
        { organizationId: "org_1", userId: "user_1" }
      ),
    /Provider not found/
  );
});

test("getInboundSmsById throws if SMS is not found", async (t) => {
  const { db, ignoreInboundSms } = await loadInboundSmsTestContext();

  const findFirstMock = stubMethod(db.inboundSms, "findFirst", async () => null);

  t.after(() => {
    findFirstMock.restore();
    mock.restoreAll();
  });

  await assert.rejects(
    () => ignoreInboundSms("sms_missing", undefined, { organizationId: "org_1", userId: "user_1" }),
    /Inbound SMS not found/
  );
});

// ---------------------------------------------------------------------------
// processInboundSmsAction — action routing
// ---------------------------------------------------------------------------

// Strategy: stub findFirst to return a RECORDED SMS. Each action routes to a
// different function, each of which has a distinct "cannot X a RECORDED SMS"
// guard — so the thrown error tells us exactly which function was reached.

test("processInboundSmsAction routes 'review' to reviewInboundSms", async (t) => {
  const { db, processInboundSmsAction } = await loadInboundSmsTestContext();

  const findFirstMock = stubMethod(db.inboundSms, "findFirst", async () => ({
    id: "sms_1",
    organizationId: "org_1",
    status: "RECORDED",
    branch: null,
    submittedBy: null,
    reviewedBy: null,
    transaction: null,
  }));

  t.after(() => {
    findFirstMock.restore();
    mock.restoreAll();
  });

  await assert.rejects(
    () =>
      processInboundSmsAction(
        "sms_1",
        { action: "review", payload: { branchId: "b", tillId: "t", type: "DEPOSIT", amount: 1000 } },
        { organizationId: "org_1", userId: "user_1" }
      ),
    /Recorded SMS cannot be reviewed again/
  );
});

test("processInboundSmsAction routes 'record' to recordReviewedInboundSms", async (t) => {
  const { db, processInboundSmsAction } = await loadInboundSmsTestContext();

  // recordReviewedInboundSms calls reviewInboundSms internally, which hits the RECORDED guard
  const findFirstMock = stubMethod(db.inboundSms, "findFirst", async () => ({
    id: "sms_1",
    organizationId: "org_1",
    status: "RECORDED",
    branch: null,
    submittedBy: null,
    reviewedBy: null,
    transaction: null,
  }));

  t.after(() => {
    findFirstMock.restore();
    mock.restoreAll();
  });

  await assert.rejects(
    () =>
      processInboundSmsAction(
        "sms_1",
        { action: "record", payload: { branchId: "b", tillId: "t", type: "DEPOSIT", amount: 1000 } },
        { organizationId: "org_1", userId: "user_1" }
      ),
    /Recorded SMS cannot be reviewed again/
  );
});

test("processInboundSmsAction routes 'ignore' to ignoreInboundSms", async (t) => {
  const { db, processInboundSmsAction } = await loadInboundSmsTestContext();

  const findFirstMock = stubMethod(db.inboundSms, "findFirst", async () => ({
    id: "sms_1",
    organizationId: "org_1",
    status: "RECORDED",
    branch: null,
    submittedBy: null,
    reviewedBy: null,
    transaction: null,
  }));

  t.after(() => {
    findFirstMock.restore();
    mock.restoreAll();
  });

  await assert.rejects(
    () =>
      processInboundSmsAction(
        "sms_1",
        { action: "ignore", reason: "not relevant" },
        { organizationId: "org_1", userId: "user_1" }
      ),
    /Recorded SMS cannot be ignored/
  );
});

test("processInboundSmsAction throws for an unsupported action", async () => {
  const { processInboundSmsAction } = await loadInboundSmsTestContext();

  await assert.rejects(
    () =>
      processInboundSmsAction(
        "sms_1",
        { action: "unknown" } as unknown as Parameters<typeof processInboundSmsAction>[1],
        { organizationId: "org_1", userId: "user_1" }
      ),
    /Unsupported SMS action/
  );
});

// ---------------------------------------------------------------------------
// Read-path — getInboundSmsList
// ---------------------------------------------------------------------------

test("getInboundSmsList returns paginated results with correct shape using default page and pageSize", async (t) => {
  const { db, getInboundSmsList } = await loadInboundSmsTestContext();

  const rows = [
    { id: "sms_1", status: "PARSED", branch: null, submittedBy: null, reviewedBy: null, transaction: null },
    { id: "sms_2", status: "FAILED", branch: null, submittedBy: null, reviewedBy: null, transaction: null },
  ];

  const findManyMock = stubMethod(db.inboundSms, "findMany", async () => rows);
  const countMock = stubMethod(db.inboundSms, "count", async () => 42);

  t.after(() => {
    findManyMock.restore();
    countMock.restore();
    mock.restoreAll();
  });

  const result = await getInboundSmsList("org_1");

  // Shape
  assert.equal(result.page, 1);
  assert.equal(result.pageSize, 20);
  assert.equal(result.total, 42);
  assert.equal(result.totalPages, 3); // Math.ceil(42 / 20)
  assert.equal(result.data.length, 2);
  assert.equal(result.data[0].id, "sms_1");

  // Default skip=0, take=20 forwarded to findMany
  const findManyArgs = findManyMock.stub.mock.calls[0].arguments[0] as {
    skip: number;
    take: number;
    where: { organizationId: string };
  };
  assert.equal(findManyArgs.skip, 0);
  assert.equal(findManyArgs.take, 20);
  assert.equal(findManyArgs.where.organizationId, "org_1");
});

test("getInboundSmsList computes skip correctly for a custom page and pageSize", async (t) => {
  const { db, getInboundSmsList } = await loadInboundSmsTestContext();

  const findManyMock = stubMethod(db.inboundSms, "findMany", async () => []);
  const countMock = stubMethod(db.inboundSms, "count", async () => 100);

  t.after(() => {
    findManyMock.restore();
    countMock.restore();
    mock.restoreAll();
  });

  const result = await getInboundSmsList("org_1", { page: 3, pageSize: 10 });

  const findManyArgs = findManyMock.stub.mock.calls[0].arguments[0] as {
    skip: number;
    take: number;
  };
  assert.equal(findManyArgs.skip, 20); // (3 - 1) * 10
  assert.equal(findManyArgs.take, 10);
  assert.equal(result.page, 3);
  assert.equal(result.pageSize, 10);
  assert.equal(result.totalPages, 10); // Math.ceil(100 / 10)
});

test("getInboundSmsList includes active filters in the where clause and omits absent ones", async (t) => {
  const { db, getInboundSmsList } = await loadInboundSmsTestContext();

  const findManyMock = stubMethod(db.inboundSms, "findMany", async () => []);
  const countMock = stubMethod(db.inboundSms, "count", async () => 0);

  t.after(() => {
    findManyMock.restore();
    countMock.restore();
    mock.restoreAll();
  });

  await getInboundSmsList("org_1", { branchId: "branch_1", status: "PARSED" });

  const findManyArgs = findManyMock.stub.mock.calls[0].arguments[0] as {
    where: Record<string, unknown>;
  };
  const countArgs = countMock.stub.mock.calls[0].arguments[0] as {
    where: Record<string, unknown>;
  };

  // Active filters present
  assert.equal(findManyArgs.where.organizationId, "org_1");
  assert.equal(findManyArgs.where.branchId, "branch_1");
  assert.equal(findManyArgs.where.status, "PARSED");

  // Absent filters not added
  assert.ok(!("source" in findManyArgs.where));
  assert.ok(!("provider" in findManyArgs.where));

  // findMany and count receive the same where
  assert.deepEqual(findManyArgs.where, countArgs.where);
});

// ---------------------------------------------------------------------------
// Read-path — getInboundSmsById
// ---------------------------------------------------------------------------

test("getInboundSmsById returns the SMS record when found", async (t) => {
  const { db, getInboundSmsById } = await loadInboundSmsTestContext();

  const record = {
    id: "sms_detail_1",
    organizationId: "org_1",
    status: "REVIEWED",
    provider: "MPESA",
    parsedAmount: 30000,
    branch: { id: "branch_1", name: "Main" },
    submittedBy: { id: "user_1", name: "Alice" },
    reviewedBy: null,
    transaction: null,
  };

  const findFirstMock = stubMethod(db.inboundSms, "findFirst", async () => record);

  t.after(() => {
    findFirstMock.restore();
    mock.restoreAll();
  });

  const result = await getInboundSmsById("sms_detail_1", "org_1");

  // Correct record returned
  assert.equal(result.id, "sms_detail_1");
  assert.equal(result.status, "REVIEWED");
  assert.equal(result.provider, "MPESA");

  // Query scoped to both id and organizationId
  const findArgs = findFirstMock.stub.mock.calls[0].arguments[0] as {
    where: { id: string; organizationId: string };
  };
  assert.equal(findArgs.where.id, "sms_detail_1");
  assert.equal(findArgs.where.organizationId, "org_1");
});
