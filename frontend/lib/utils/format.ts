/**
 * FINIX is a GBP platform: en-GB formatting, Europe/London civil time.
 * All balances/amounts are integer pence; only these helpers turn them into display strings (pence ÷ 100 for display only).
 */
export const LOCALE = "en-GB";
export const TIME_ZONE = "Europe/London";
export const DEFAULT_CURRENCY = "GBP";

/** Major-unit (pounds) display value → "£1,250.00". Never use for ledger arithmetic. */
export const formatGBP = (amount: number): string =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

/** Integer pence → formatted money. */
export function money(minor: number, currency = DEFAULT_CURRENCY, opts: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2, ...opts }).format(minor / 100);
}

/** Exact decimal string ("12.50", "0.1") → integer pence without floating-point rounding. Caller validates ≤2 dp. */
export function toMinor(decimal: string): number {
  const [whole = "0", frac = ""] = decimal.trim().split(".");
  return Number(whole) * 100 + Number((frac + "00").slice(0, 2));
}

/** Signed amount for transaction rows: "+£12.00" / "−£12.00". */
export function signedMoney(minor: number, currency = DEFAULT_CURRENCY) {
  const abs = money(Math.abs(minor), currency);
  return minor > 0 ? `+${abs}` : minor < 0 ? `−${abs}` : abs;
}

export const compactMoney = (minor: number, currency = DEFAULT_CURRENCY) =>
  new Intl.NumberFormat(LOCALE, { style: "currency", currency, notation: "compact", minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(minor / 100);

export const percent = (value: number, digits = 1) =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(digits)}%`;

export const dateShort = (iso: string) =>
  new Intl.DateTimeFormat(LOCALE, { month: "short", day: "numeric", timeZone: TIME_ZONE }).format(new Date(iso));
export const dateLong = (iso: string) =>
  new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium", timeStyle: "short", timeZone: TIME_ZONE }).format(new Date(iso));

export function greeting(date = new Date()) {
  const h = date.getHours();
  return h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]!.toUpperCase()).join("");

/** Decimal price in a security's NATIVE currency (e.g. USD → "US$189.45"). Never relabels a currency symbol. */
export function formatPrice(value: string | number, currency: string, digits = 2) {
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(value));
}
export function formatSigned(value: string | number, digits = 2) {
  const n = Number(value);
  return `${n > 0 ? "+" : n < 0 ? "\u2212" : ""}${Math.abs(n).toFixed(digits)}`;
}
export const timeLondon = (iso: string) =>
  new Intl.DateTimeFormat(LOCALE, { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE, timeZoneName: "short" }).format(new Date(iso));
export const dateTimeLondon = (iso: string) =>
  new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE, timeZoneName: "short" }).format(new Date(iso));
