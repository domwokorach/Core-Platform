"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTransfers } from "@/hooks/use-banking";
import { useAuth } from "@/providers/auth-provider";

const KEY = "finix.notifications.read.v1";
const WINDOW_MS = 7 * 24 * 3600 * 1000;

export interface NotificationItem { id: string; amountMinor: number; currency: string; reference: string; createdAt: string; read: boolean }

const load = (): Set<string> => { try { return new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]); } catch { return new Set(); } };
const save = (s: Set<string>) => { try { localStorage.setItem(KEY, JSON.stringify([...s].slice(-200))); } catch { /* storage unavailable: read state lasts for this page view only */ } };

/**
 * Notifications are real committed transfers from the last 7 days (nothing is fabricated; signed-out demo has none).
 * Read state is a per-browser convenience. `ringKey` increments when an unread notification arrives after first load.
 */
export function useNotifications() {
  const { user } = useAuth();
  const { data: transfers, isDemo } = useTransfers();
  const [read, setRead] = useState<Set<string>>(() => new Set());
  const [ringKey, setRingKey] = useState(0);
  const prev = useRef<number | null>(null);
  useEffect(() => setRead(load()), []);

  const recent = !user || isDemo ? [] : (transfers ?? []).filter(t => Date.now() - Date.parse(t.createdAt) < WINDOW_MS);
  const items: NotificationItem[] = recent.map(t => ({ id: t.id, amountMinor: t.amountMinor, currency: t.currency, reference: t.reference, createdAt: t.createdAt, read: read.has(t.id) }));
  const unread = items.filter(i => !i.read).length;

  useEffect(() => {
    if (transfers === undefined) return;
    if (prev.current !== null && unread > prev.current) setRingKey(k => k + 1);
    prev.current = unread;
  }, [unread, transfers]);

  const markRead = useCallback((id: string) => setRead(r => { const n = new Set(r).add(id); save(n); return n; }), []);
  const markAllRead = useCallback(() => setRead(r => { const n = new Set(r); items.forEach(i => n.add(i.id)); save(n); return n; }), [items]);
  return { items, unread, ringKey, markRead, markAllRead };
}

/** "5 minutes ago" style label; falls back to the caller's own formatting until the client clock is known. */
export function timeAgo(iso: string, now: number): string {
  const s = Math.round((Date.parse(iso) - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });
  const a = Math.abs(s);
  if (a < 60) return "just now";
  if (a < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (a < 86400) return rtf.format(Math.round(s / 3600), "hour");
  return rtf.format(Math.round(s / 86400), "day");
}
