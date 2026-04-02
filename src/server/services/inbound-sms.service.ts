import crypto from "node:crypto";
import { db } from "@server/lib/db";
import { createAuditLog } from "./audit.service";
import { createTransaction } from "./transaction.service";
import { parseInboundSmsMessage } from "./sms-parsers";
import type {
  InboundSmsActionInput,
  InboundSmsCreateInput,
  InboundSmsReviewInput,
} from "@server/validations/inbound-sms";
import {
  Prisma,
  SmsProcessingStatus,
  SmsProvider,
  SmsSource,
} from "@prisma/client";

function computeFingerprint(params: {
  organizationId: string;
  source: SmsSource;
  sender?: string;
  message: string;
  receivedAt: Date;
}) {
  return crypto
    .createHash("sha256")
    .update(
      [
        params.organizationId,
        params.source,
        params.sender?.trim().toLowerCase() ?? "",
        params.message.trim().replace(/\s+/g, " ").toLowerCase(),
        params.receivedAt.toISOString(),
      ].join("|")
    )
    .digest("hex");
}

function normalizePhone(value?: string | null) {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 9) return `0${digits}`;
  if (digits.length === 10 && digits.startsWith("0")) return digits;
  if (digits.length === 12 && digits.startsWith("255")) return `0${digits.slice(3)}`;
  return value;
}

function toParsedDataJson(parsed: ReturnType<typeof parseInboundSmsMessage>): Prisma.InputJsonValue {
  return parsed.rawSummary as unknown as Prisma.InputJsonValue;
}

export async function ingestInboundSms(
  input: InboundSmsCreateInput,
  context: {
    organizationId: string;
    userId: string;
    ipAddress?: string;
    userAgent?: string;
  }
) {
  const receivedAt = input.receivedAt ?? new Date();
  const fingerprint = computeFingerprint({
    organizationId: context.organizationId,
    source: input.source,
    sender: input.sender || undefined,
    message: input.message,
    receivedAt,
  });

  const existing = await db.inboundSms.findUnique({ where: { fingerprint } });
  if (existing) {
    return existing;
  }

  const parsed = parseInboundSmsMessage(input.message, input.providerHint, input.sender || undefined);
  const status: SmsProcessingStatus = parsed.parseError ? "FAILED" : "PARSED";

  const sms = await db.inboundSms.create({
    data: {
      organizationId: context.organizationId,
      branchId: input.branchId || null,
      source: input.source,
      provider: parsed.provider,
      status,
      sender: input.sender || null,
      message: input.message,
      fingerprint,
      receivedAt,
      parsedAt: new Date(),
      failedAt: status === "FAILED" ? new Date() : null,
      parseConfidence: parsed.parseConfidence,
      parseError: parsed.parseError,
      parsedType: parsed.type,
      parsedAmount: parsed.amount,
      parsedReference: parsed.reference || null,
      parsedExternalRef: parsed.externalRef || null,
      parsedCustomerPhone: parsed.customerPhone || null,
      parsedData: toParsedDataJson(parsed),
      submittedById: context.userId,
    },
    include: {
      branch: { select: { id: true, name: true } },
      transaction: { select: { id: true, status: true, type: true, amount: true } },
    },
  });

  await createAuditLog({
    organizationId: context.organizationId,
    userId: context.userId,
    action: "SMS_INGESTED",
    resourceType: "inbound_sms",
    resourceId: sms.id,
    description: `Inbound SMS ingested via ${input.source}`,
    after: {
      provider: sms.provider,
      status: sms.status,
      branchId: sms.branchId,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return sms;
}

export async function getInboundSmsList(
  organizationId: string,
  filters: {
    branchId?: string;
    status?: SmsProcessingStatus;
    source?: SmsSource;
    provider?: SmsProvider;
    page?: number;
    pageSize?: number;
  } = {}
) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const skip = (page - 1) * pageSize;

  const where = {
    organizationId,
    ...(filters.branchId && { branchId: filters.branchId }),
    ...(filters.status && { status: filters.status }),
    ...(filters.source && { source: filters.source }),
    ...(filters.provider && { provider: filters.provider }),
  };

  const [data, total] = await Promise.all([
    db.inboundSms.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        submittedBy: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, name: true } },
        transaction: {
          select: { id: true, type: true, amount: true, status: true, reference: true },
        },
      },
      orderBy: { receivedAt: "desc" },
      skip,
      take: pageSize,
    }),
    db.inboundSms.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getInboundSmsById(id: string, organizationId: string) {
  const sms = await db.inboundSms.findFirst({
    where: { id, organizationId },
    include: {
      branch: { select: { id: true, name: true } },
      submittedBy: { select: { id: true, name: true } },
      reviewedBy: { select: { id: true, name: true } },
      transaction: {
        select: { id: true, type: true, amount: true, status: true, reference: true },
      },
    },
  });

  if (!sms) {
    throw new Error("Inbound SMS not found");
  }

  return sms;
}

async function validateReviewDependencies(
  organizationId: string,
  payload: InboundSmsReviewInput
) {
  const [branch, till, provider] = await Promise.all([
    db.branch.findFirst({ where: { id: payload.branchId, organizationId } }),
    db.till.findFirst({ where: { id: payload.tillId, organizationId } }),
    payload.providerId
      ? db.provider.findFirst({ where: { id: payload.providerId, organizationId } })
      : Promise.resolve(null),
  ]);

  if (!branch) throw new Error("Branch not found");
  if (!till) throw new Error("Till not found");
  if (till.branchId !== branch.id) throw new Error("Till does not belong to the selected branch");
  if (payload.providerId && !provider) throw new Error("Provider not found");
}

export async function reviewInboundSms(
  id: string,
  payload: InboundSmsReviewInput,
  context: {
    organizationId: string;
    userId: string;
    ipAddress?: string;
    userAgent?: string;
  }
) {
  const sms = await getInboundSmsById(id, context.organizationId);
  if (sms.status === "RECORDED") {
    throw new Error("Recorded SMS cannot be reviewed again");
  }

  await validateReviewDependencies(context.organizationId, payload);

  const updated = await db.inboundSms.update({
    where: { id },
    data: {
      branchId: payload.branchId,
      parsedTillId: payload.tillId,
      parsedProviderId: payload.providerId || null,
      parsedType: payload.type,
      parsedAmount: payload.amount,
      parsedReference: payload.reference || null,
      parsedExternalRef: payload.externalRef || null,
      parsedCustomerPhone: normalizePhone(payload.customerPhone) || null,
      reviewNotes: payload.notes || null,
      status: "REVIEWED",
      reviewedAt: new Date(),
      reviewedById: context.userId,
      parseError: null,
    },
    include: {
      branch: { select: { id: true, name: true } },
      transaction: { select: { id: true, status: true, type: true, amount: true } },
    },
  });

  await createAuditLog({
    organizationId: context.organizationId,
    userId: context.userId,
    action: "SMS_REVIEWED",
    resourceType: "inbound_sms",
    resourceId: id,
    description: "Inbound SMS reviewed and prepared for recording",
    after: {
      branchId: updated.branchId,
      tillId: updated.parsedTillId,
      providerId: updated.parsedProviderId,
      type: updated.parsedType,
      amount: Number(updated.parsedAmount ?? 0),
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return updated;
}

export async function ignoreInboundSms(
  id: string,
  reason: string | undefined,
  context: {
    organizationId: string;
    userId: string;
    ipAddress?: string;
    userAgent?: string;
  }
) {
  const sms = await getInboundSmsById(id, context.organizationId);
  if (sms.status === "RECORDED") {
    throw new Error("Recorded SMS cannot be ignored");
  }

  const updated = await db.inboundSms.update({
    where: { id },
    data: {
      status: "IGNORED",
      ignoredAt: new Date(),
      reviewNotes: reason || sms.reviewNotes,
      reviewedAt: new Date(),
      reviewedById: context.userId,
    },
  });

  await createAuditLog({
    organizationId: context.organizationId,
    userId: context.userId,
    action: "SMS_IGNORED",
    resourceType: "inbound_sms",
    resourceId: id,
    description: `Inbound SMS ignored${reason ? `: ${reason}` : ""}`,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return updated;
}

export async function recordReviewedInboundSms(
  id: string,
  payload: InboundSmsReviewInput,
  context: {
    organizationId: string;
    userId: string;
    ipAddress?: string;
    userAgent?: string;
  }
) {
  const sms = await reviewInboundSms(id, payload, context);

  if (sms.linkedTransactionId) {
    throw new Error("This SMS is already linked to a transaction");
  }

  const transaction = await createTransaction(
    {
      branchId: payload.branchId,
      tillId: payload.tillId,
      providerId: payload.providerId || undefined,
      type: payload.type,
      amount: payload.amount,
      reference: payload.reference || undefined,
      externalRef: payload.externalRef || sms.parsedExternalRef || undefined,
      customerPhone: normalizePhone(payload.customerPhone) || undefined,
      notes: [payload.notes, `Imported from SMS ${sms.id}`].filter(Boolean).join(" | "),
    },
    context.userId,
    context.organizationId,
    context.ipAddress
  );

  const updated = await db.inboundSms.update({
    where: { id },
    data: {
      status: "RECORDED",
      linkedTransactionId: transaction.id,
      recordedAt: new Date(),
      reviewedAt: sms.reviewedAt ?? new Date(),
      reviewedById: context.userId,
    },
    include: {
      branch: { select: { id: true, name: true } },
      transaction: {
        select: { id: true, type: true, amount: true, status: true, reference: true },
      },
    },
  });

  await createAuditLog({
    organizationId: context.organizationId,
    userId: context.userId,
    action: "SMS_RECORDED",
    resourceType: "inbound_sms",
    resourceId: id,
    description: `Inbound SMS recorded as transaction ${transaction.id}`,
    after: {
      transactionId: transaction.id,
      type: transaction.type,
      amount: Number(transaction.amount),
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return updated;
}

export async function processInboundSmsAction(
  id: string,
  input: InboundSmsActionInput,
  context: {
    organizationId: string;
    userId: string;
    ipAddress?: string;
    userAgent?: string;
  }
) {
  switch (input.action) {
    case "review":
      return reviewInboundSms(id, input.payload, context);
    case "record":
      return recordReviewedInboundSms(id, input.payload, context);
    case "ignore":
      return ignoreInboundSms(id, input.reason, context);
    default:
      throw new Error("Unsupported SMS action");
  }
}
