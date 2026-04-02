import { SmsProvider, SmsSource, TransactionType } from "@prisma/client";
import { z } from "zod";

const transactionTypeValues = [
  "FLOAT_PURCHASE",
  "DEPOSIT",
  "WITHDRAWAL",
  "TRANSFER",
  "AIRTIME_SALE",
  "BILL_PAYMENT",
  "MERCHANT_PAYMENT",
  "REVERSAL",
  "ADJUSTMENT",
  "EXPENSE",
  "OWNER_WITHDRAWAL",
  "OWNER_INJECTION",
  "BANK_DEPOSIT",
  "BANK_WITHDRAWAL",
  "INTER_BRANCH_TRANSFER",
] as const satisfies readonly TransactionType[];

export const inboundSmsCreateSchema = z.object({
  source: z.nativeEnum(SmsSource),
  branchId: z.string().optional(),
  sender: z.string().max(100).optional().or(z.literal("")),
  message: z.string().min(5).max(5000),
  receivedAt: z.coerce.date().optional(),
  providerHint: z.nativeEnum(SmsProvider).optional(),
});

export const inboundSmsReviewSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  tillId: z.string().min(1, "Till is required"),
  providerId: z.string().optional(),
  type: z.enum(transactionTypeValues),
  amount: z.number().positive(),
  reference: z.string().max(100).optional().or(z.literal("")),
  externalRef: z.string().max(100).optional().or(z.literal("")),
  customerPhone: z.string().max(30).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export const inboundSmsActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("review"),
    payload: inboundSmsReviewSchema,
  }),
  z.object({
    action: z.literal("record"),
    payload: inboundSmsReviewSchema,
  }),
  z.object({
    action: z.literal("ignore"),
    reason: z.string().min(3).max(500).optional(),
  }),
]);

export type InboundSmsCreateInput = z.infer<typeof inboundSmsCreateSchema>;
export type InboundSmsReviewInput = z.infer<typeof inboundSmsReviewSchema>;
export type InboundSmsActionInput = z.infer<typeof inboundSmsActionSchema>;
