import { z } from "zod";

export const reconciliationFloatItemSchema = z.object({
  providerId: z.string().min(1),
  actualFloat: z
    .number({ message: "Enter actual float amount" })
    .min(0, "Cannot be negative"),
  varianceNotes: z.string().max(500).optional().or(z.literal("")),
});

export const createReconciliationSchema = z.object({
  branchId: z.string().min(1, "Branch required"),
  shiftId: z.string().optional(),
  date: z.coerce.date(),
  actualCash: z
    .number({ message: "Enter actual cash amount" })
    .min(0, "Cannot be negative"),
  floatItems: z
    .array(reconciliationFloatItemSchema)
    .min(1, "At least one float item required"),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export const approveReconciliationSchema = z.object({
  notes: z.string().max(500).optional(),
});

export const rejectReconciliationSchema = z.object({
  rejectionReason: z.string().min(5, "Provide a reason").max(500),
});

export type CreateReconciliationInput = z.infer<typeof createReconciliationSchema>;
export type ApproveReconciliationInput = z.infer<typeof approveReconciliationSchema>;
export type RejectReconciliationInput = z.infer<typeof rejectReconciliationSchema>;
