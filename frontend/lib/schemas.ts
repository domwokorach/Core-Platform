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

export const loginSchema = z.object({
  identifier: z.string().trim()
    .min(1, "Enter your email address or username")
    .max(254, "That looks too long. Check your email address or username")
    .refine(v => !/\s/.test(v), "Email addresses and usernames can't contain spaces"),
});

export type LoginValues = z.infer<typeof loginSchema>;

/**
 * Spending-limit policy. Mirrors the API (CardService); the server is the authority and re-validates everything.
 * Amounts are entered in pounds and sent as integer pence.
 */
export const CARD_LIMIT_MAX = { dailyMinor: 500_000, monthlyMinor: 2_000_000, singleMinor: 250_000 } as const;
export const CARD_LIMIT_MIN_MINOR = 100;
export const CARD_DEFAULT_LIMITS = { dailyMinor: 50_000, monthlyMinor: 300_000, singleMinor: 25_000 } as const;

const limitField = (label: string, maxMinor: number) => z.string().trim()
  .regex(/^\d+(\.\d{1,2})?$/, `${label}: enter an amount in pounds, up to two decimal places`)
  .refine(v => toMinor(v) >= CARD_LIMIT_MIN_MINOR, `${label} must be at least £1.00`)
  .refine(v => toMinor(v) <= maxMinor, `${label} can't be more than £${(maxMinor / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`);

export const cardLimitsSchema = z.object({
  daily: limitField("Daily limit", CARD_LIMIT_MAX.dailyMinor),
  monthly: limitField("Monthly limit", CARD_LIMIT_MAX.monthlyMinor),
  single: limitField("Single-transaction limit", CARD_LIMIT_MAX.singleMinor),
  onlineEnabled: z.boolean(),
}).superRefine((v, ctx) => {
  if (toMinor(v.single) > toMinor(v.daily)) ctx.addIssue({ code: "custom", path: ["single"], message: "The single-transaction limit can't exceed the daily limit" });
  if (toMinor(v.daily) > toMinor(v.monthly)) ctx.addIssue({ code: "custom", path: ["daily"], message: "The daily limit can't exceed the monthly limit" });
});
export type CardLimitsValues = z.infer<typeof cardLimitsSchema>;

export const createCardSchema = z.object({
  accountId: z.string().min(1, "Choose an account to link"),
  cardType: z.enum(["EVERYDAY", "SAVINGS"]),
  acknowledged: z.boolean().refine(v => v, "Confirm that this is a sandbox card"),
});
export type CreateCardValues = z.infer<typeof createCardSchema>;
