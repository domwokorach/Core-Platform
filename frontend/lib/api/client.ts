import type { Account, Dashboard, Transaction, TransferReceipt } from "@/types/banking";

export const apiRoot = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string, readonly retryAfterSeconds?: number) { super(message); }
}

export async function request<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiRoot}${url}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({})) as { message?: string; code?: string; retryAfterSeconds?: number };
    throw new ApiError(error.message || `Request failed (${res.status})`, res.status, error.code, error.retryAfterSeconds);
  }
  return res.json() as Promise<T>;
}

export interface TransferPayload {
  sourceAccountId: string;
  destinationAccountId: string;
  amountMinor: number;
  description: string;
}

export const getDashboard = (token: string) => request<Dashboard>("/api/dashboard", token);
export const getAccounts = (token: string) => request<Account[]>("/api/accounts", token);
export const getTransactions = (token: string) => request<Transaction[]>("/api/transactions", token);
export const getTransfers = (token: string) => request<TransferReceipt[]>("/api/transfers", token);

export const createTransfer = (token: string, payload: TransferPayload, idempotencyKey: string) =>
  request<TransferReceipt>("/api/transfers", token, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(payload),
  });
