import { apiRoot } from "@/lib/api/client";

/**
 * Live dashboard notifications over Server-Sent Events, read with fetch streaming so the OIDC access token travels
 * in the Authorization header (EventSource cannot set headers and tokens must never appear in URLs).
 *
 * Events are invalidation hints only. `onReady` fires on every (re)connect and `onUpdated` on every
 * `dashboard.updated`; the caller must respond by re-reading GET /api/dashboard.
 */
export type StreamState = "idle" | "connecting" | "live" | "reconnecting" | "offline" | "unauthorized";

interface Options {
  /** Current access token, or null when signed out / expired (the stream then stops as "unauthorized"). */
  getToken: () => string | null;
  onState: (state: StreamState) => void;
  onReady: () => void;
  onUpdated: () => void;
  /** Stream path; defaults to the banking dashboard stream. */
  path?: string;
  /** Name of the invalidation event; defaults to `dashboard.updated`. */
  updatedEvent?: string;
}

const MIN_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;
const DEFAULT_HEARTBEAT_S = 20;

/** Returns a function that closes the stream and stops all reconnection. */
export function openDashboardStream(options: Options): () => void {
  let stopped = false;
  let controller: AbortController | null = null;
  let wake: (() => void) | null = null;

  const sleep = (ms: number) => new Promise<void>(resolve => {
    const timer = setTimeout(done, ms);
    function done() { clearTimeout(timer); wake = null; resolve(); }
    wake = done;
  });

  const onOnline = () => wake?.();
  const onOffline = () => controller?.abort();
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);

  async function run() {
    let attempt = 0;
    let everConnected = false;
    while (!stopped) {
      if (!navigator.onLine) {
        options.onState("offline");
        await sleep(MAX_DELAY_MS);
        attempt = 0;
        continue;
      }
      const token = options.getToken();
      if (!token) { options.onState("unauthorized"); return; }
      options.onState(everConnected ? "reconnecting" : "connecting");
      controller = new AbortController();
      let watchdog: ReturnType<typeof setTimeout> | undefined;
      try {
        const res = await fetch(`${apiRoot}${options.path ?? "/api/events/stream"}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
          cache: "no-store",
          signal: controller.signal,
        });
        if (res.status === 401 || res.status === 403) { options.onState("unauthorized"); return; }
        if (!res.ok || !res.body) throw new Error(`Stream refused (${res.status})`);

        let silenceMs = DEFAULT_HEARTBEAT_S * 2.5 * 1000;
        const arm = () => { clearTimeout(watchdog); watchdog = setTimeout(() => controller?.abort(), silenceMs); };
        arm();
        for await (const message of readEvents(res.body)) {
          arm(); // any bytes, keepalive comments included, prove the connection is alive
          if (message.event === "stream.ready") {
            try { silenceMs = Math.max(5, Number(JSON.parse(message.data).heartbeatSeconds) || DEFAULT_HEARTBEAT_S) * 2.5 * 1000; } catch { /* keep default */ }
            everConnected = true;
            attempt = 0;
            options.onState("live");
            options.onReady();
          } else if (message.event === (options.updatedEvent ?? "dashboard.updated")) {
            options.onUpdated();
          }
        }
      } catch {
        /* network error, watchdog abort or offline: fall through to backoff */
      } finally {
        clearTimeout(watchdog);
      }
      if (stopped) return;
      options.onState(navigator.onLine ? "reconnecting" : "offline");
      // Exponential backoff with jitter; an `online` event cuts the wait short.
      await sleep(Math.min(MAX_DELAY_MS, MIN_DELAY_MS * 2 ** attempt) * (0.5 + Math.random() / 2));
      attempt++;
    }
  }

  void run();
  return () => {
    stopped = true;
    controller?.abort();
    wake?.();
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };
}

interface SseMessage { event: string; data: string }

/** Minimal SSE parser. Yields once per received chunk for comment-only blocks too, so callers can reset watchdogs. */
async function* readEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<SseMessage> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      let split: RegExpExecArray | null;
      while ((split = /\r?\n\r?\n/.exec(buffer))) {
        const block = buffer.slice(0, split.index);
        buffer = buffer.slice(split.index + split[0].length);
        let event = "message";
        const data: string[] = [];
        for (const line of block.split(/\r?\n/)) {
          if (line.startsWith(":")) continue;
          const colon = line.indexOf(":");
          const field = colon === -1 ? line : line.slice(0, colon);
          const text = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "");
          if (field === "event") event = text;
          else if (field === "data") data.push(text);
        }
        yield { event: block.split(/\r?\n/).every(l => l.startsWith(":")) ? "comment" : event, data: data.join("\n") };
      }
    }
  } finally {
    reader.cancel().catch(() => undefined);
  }
}
