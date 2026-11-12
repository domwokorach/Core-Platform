export interface Account {
  id: string;
  displayName: string;
  maskedNumber: string;
  currency: string;
  balanceMinor: number;
  brand: "VISA" | "MASTERCARD" | string;
}

/** Verified merchant metadata from the API (exact alias match server-side). Only `domain` is used to fetch a logo. */
export interface Merchant { id: string; name: string; domain: string; category: string }

export interface Transaction {
  id: string;
  accountId: string;
  description: string;
  amountMinor: number;
  currency: string;
  occurredAt: string;
  reference: string;
  /** Present only for verified merchants; null/absent → neutral fallback icon. */
  merchant?: Merchant | null;
  status?: "COMPLETED";
}

export interface Dashboard {
  customerName: string;
  accounts: Account[];
  transactions: Transaction[];
  totalBalanceMinor: number;
  monthlyIncomeMinor: number;
  monthlySpendingMinor: number;
  currency: string;
}

export interface TransferReceipt {
  id: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amountMinor: number;
  currency: string;
  reference: string;
  createdAt: string;
}

export type DateRange = "7d" | "30d" | "90d" | "all";
