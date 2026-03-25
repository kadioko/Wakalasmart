import { z } from "zod";

const transactionTypeValues = [
  "FLOAT_PURCHASE",
  "DEPOSIT",
  "WITHDRAWAL",
  "TRANSFER",
  "AIRTIME_SALE",
  "BILL_PAYMENT",
  "MERCHANT_PAYMENT",
  "CASH_IN",
  "CASH_OUT",
] as const;

export const createTransactionSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  tillId: z.string().min(1, "Till is required"),
  providerId: z.string().optional(),
  type: z.enum(transactionTypeValues),
  amount: z
    .number({ message: "Amount must be a number" })
    .positive("Amount must be positive")
    .max(100_000_000, "Amount too large"),
  fee: z.number().min(0).optional().default(0),
  commission: z.number().min(0).optional().default(0),
  reference: z
    .string()
    .max(100, "Reference too long")
    .optional()
    .or(z.literal("")),
  externalRef: z.string().max(100).optional().or(z.literal("")),
  customerPhone: z
    .string()
    .regex(/^(\+?255|0)[67]\d{8}$/, "Invalid Tanzanian phone number")
    .optional()
    .or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
  transactedAt: z.coerce.date().optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

// Validate that float transactions have a provider
const floatTypes = [
  "FLOAT_PURCHASE",
  "DEPOSIT",
  "WITHDRAWAL",
  "TRANSFER",
  "AIRTIME_SALE",
  "BILL_PAYMENT",
  "MERCHANT_PAYMENT",
] as const;

export const createTransactionRefinedSchema = createTransactionSchema.refine(
  (data) => {
    if ((floatTypes as readonly string[]).includes(data.type) && !data.providerId) {
      return false;
    }
    return true;
  },
  {
    message: "Provider is required for this transaction type",
    path: ["providerId"],
  }
);
