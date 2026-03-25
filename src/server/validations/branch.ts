import { z } from "zod";

export const createBranchSchema = z.object({
  name: z.string().min(2, "Branch name required").max(100),
  code: z.string().max(20).optional().or(z.literal("")),
  location: z.string().max(200).optional().or(z.literal("")),
  phone: z
    .string()
    .regex(/^(\+?255|0)[67]\d{8}$/, "Invalid phone number")
    .optional()
    .or(z.literal("")),
  managerId: z.string().optional(),
  openingTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:MM)")
    .optional()
    .or(z.literal("")),
  closingTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:MM)")
    .optional()
    .or(z.literal("")),
});

export const updateBranchSchema = createBranchSchema.partial();

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
