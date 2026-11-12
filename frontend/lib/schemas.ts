import { z } from "zod";
import { toMinor } from "@/lib/utils/format";

/** Max amount mirrors the API's @Max(100_000_000) minor units. The server remains the authority on funds and ownership. */
export const MAX_MINOR = 100_000_000;


export const transferSchema = z.object({
  sourceAccountId: z.string().min(1, "Choose an account to send from"),
  destinationAccountId: z.string().min(1, "Choose an account to send to"),
  amount: z.string().trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount, up to two decimal places")
    .refine(v => Number(v) > 0, "Amount must be greater than zero")
    .refine(v => toMinor(v) <= MAX_MINOR, "Amount is above the transfer limit of £1,000,000.00"),
  description: z.string().trim().min(1, "Add a short reference").max(120, "Keep the reference under 120 characters"),
}).refine(v => v.sourceAccountId !== v.destinationAccountId, { path: ["destinationAccountId"], message: "Choose two different accounts" });

export type TransferValues = z.infer<typeof transferSchema>;
