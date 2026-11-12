import type { Dashboard, TransferReceipt } from "@/types/banking";

// Fixed 09:41 UTC today so server and client render identical demo timestamps (avoids hydration mismatch).
const now = new Date(new Date().setUTCHours(9, 41, 0, 0));
const day = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86400000).toISOString();
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

/** Fictional sample data shown ONLY while signed out, and always labelled as a demo in the UI. */
export const demoDashboard: Dashboard = {
  customerName: "Alex Morgan",
  accounts: [
    { id: A, displayName: "Everyday account", maskedNumber: "•••• 4568", currency: "GBP", balanceMinor: 455615, brand: "MASTERCARD" },
    { id: B, displayName: "Savings account", maskedNumber: "•••• 0958", currency: "GBP", balanceMinor: 596800, brand: "VISA" },
  ],
  transactions: [
    { id: "d1", accountId: A, description: "Starbucks Coffee", merchant: { id: "starbucks", name: "Starbucks Coffee", domain: "starbucks.com", category: "Food & Drink" }, status: "COMPLETED", amountMinor: -1499, currency: "GBP", occurredAt: day(0), reference: "COFFEE" },
    { id: "d2", accountId: A, description: "DKNY", merchant: { id: "dkny", name: "DKNY", domain: "dkny.com", category: "Fashion" }, status: "COMPLETED", amountMinor: -4000, currency: "GBP", occurredAt: day(2), reference: "RETAIL" },
    { id: "d3", accountId: A, description: "Netflix", merchant: { id: "netflix", name: "Netflix", domain: "netflix.com", category: "Entertainment" }, status: "COMPLETED", amountMinor: -7000, currency: "GBP", occurredAt: day(5), reference: "STREAM" },
    { id: "d4", accountId: A, description: "KFC", merchant: { id: "kfc", name: "KFC", domain: "kfc.com", category: "Food & Drink" }, status: "COMPLETED", amountMinor: -1260, currency: "GBP", occurredAt: day(7), reference: "DINING" },
    { id: "d5a", accountId: A, description: "Monthly savings", amountMinor: -65000, currency: "GBP", occurredAt: day(9), reference: "TRF-DEMO-1" },
    { id: "d5b", accountId: B, description: "Monthly savings", amountMinor: 65000, currency: "GBP", occurredAt: day(9), reference: "TRF-DEMO-1" },
    { id: "d6", accountId: A, description: "Payroll", amountMinor: 376211, currency: "GBP", occurredAt: day(15), reference: "INCOME" },
  ],
  totalBalanceMinor: 1052415,
  monthlyIncomeMinor: 376211,
  monthlySpendingMinor: 193467,
  currency: "GBP",
};

export const demoTransfers: TransferReceipt[] = [
  { id: "t1", sourceAccountId: A, destinationAccountId: B, amountMinor: 65000, currency: "GBP", reference: "TRF-DEMO-1", createdAt: day(9) },
];

/* Illustrative-only feature data (no backend exists for these yet). The UI marks each as "Preview". */
export const goals = [
  { id: "g1", label: "New laptop", current: 118000, target: 180000, color: "var(--savings)" },
  { id: "g2", label: "Emergency fund", current: 750000, target: 1000000, color: "var(--savings)" },
  { id: "g3", label: "Summer travel", current: 90000, target: 400000, color: "var(--savings)" },
  { id: "g4", label: "Home deposit", current: 1200000, target: 6000000, color: "var(--savings)" },
];
