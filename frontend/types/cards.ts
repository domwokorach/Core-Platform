export type CardStatus = "PENDING_ACTIVATION" | "ACTIVE" | "FROZEN" | "BLOCKED" | "CLOSED";
export type CardType = "EVERYDAY" | "SAVINGS";

export interface CardLimits {
  dailyLimitMinor: number;
  monthlyLimitMinor: number;
  singleTransactionLimitMinor: number;
  onlineEnabled: boolean;
}

/** Sandbox card record. There is deliberately no balance and no payment-card number anywhere in this shape. */
export interface Card {
  id: string;
  cardType: CardType;
  status: CardStatus;
  /** Non-numeric display reference (e.g. "FVC •••• 7Q3K"); not a payment-card number. */
  maskedReference: string;
  currency: string;
  cardholderName: string;
  linkedAccount: { id: string; displayName: string; maskedNumber: string };
  limits: CardLimits;
  spending: { dailySpentMinor: number; monthlySpentMinor: number };
  createdAt: string;
  activatedAt: string | null;
  updatedAt: string;
}

export interface CardTransaction {
  id: string;
  cardId: string;
  merchantName: string;
  amountMinor: number;
  currency: string;
  channel: "ONLINE" | "IN_STORE";
  outcome: "APPROVED" | "DECLINED";
  declineReason: string | null;
  occurredAt: string;
}

export interface CardActivity { id: string; cardId: string; eventType: string; occurredAt: string }
