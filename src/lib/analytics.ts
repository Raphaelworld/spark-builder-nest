/**
 * Client-side analytics + error logging.
 *
 * Batches events and forwards them to the authenticated `logEvent` server fn
 * (which writes to the `public.events` table). Anonymous events are dropped
 * on the client because the events table requires an authenticated user.
 */
import { logEvent } from "./events.functions";
import { supabase } from "@/integrations/supabase/client";

type EventPayload = Record<string, unknown>;
type QueuedEvent = { name: string; payload: EventPayload };

const QUEUE: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let installed = false;
let hasSession = false;

const MAX_QUEUE = 50;
const FLUSH_MS = 1500;

function scheduleFlush() {
  if (flushTimer || typeof window === "undefined") return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, FLUSH_MS);
}

async function flush() {
  if (QUEUE.length === 0 || !hasSession) return;
  const batch = QUEUE.splice(0, QUEUE.length);
  for (const evt of batch) {
    try {
      await logEvent({ data: evt });
    } catch {
      // swallow — analytics must never break the app
    }
  }
}

export function track(name: string, payload: EventPayload = {}) {
  if (typeof window === "undefined") return;
  if (QUEUE.length >= MAX_QUEUE) QUEUE.shift();
  QUEUE.push({
    name,
    payload: {
      ...payload,
      path: window.location.pathname + window.location.search,
      ts: new Date().toISOString(),
    },
  });
  scheduleFlush();
}

export function trackError(error: unknown, context: EventPayload = {}) {
  const err = error instanceof Error ? error : new Error(String(error));
  track("client_error", {
    message: err.message,
    stack: err.stack?.slice(0, 2000),
    name: err.name,
    ...context,
  });
}

export function installAnalytics() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  // Track auth state so we only try to flush when a user is signed in.
  void supabase.auth.getSession().then(({ data }) => {
    hasSession = !!data.session;
    if (hasSession) void flush();
  });
  supabase.auth.onAuthStateChange((event, session) => {
    hasSession = !!session;
    if (event === "SIGNED_IN") track("auth_signed_in");
    if (event === "SIGNED_OUT") track("auth_signed_out");
    if (hasSession) void flush();
  });

  // Global JS errors
  window.addEventListener("error", (e) => {
    trackError(e.error ?? e.message, {
      source: "window.error",
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
    });
  });

  // Unhandled promise rejections
  window.addEventListener("unhandledrejection", (e) => {
    trackError(e.reason, { source: "unhandledrejection" });
  });

  // Delegated interaction tracking: any element with data-track="event_name"
  // (optional data-track-payload='{"json":true}') is logged on click.
  document.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLElement | null;
      const el = target?.closest<HTMLElement>("[data-track]");
      if (!el) return;
      const name = el.getAttribute("data-track");
      if (!name) return;
      let payload: EventPayload = {};
      const raw = el.getAttribute("data-track-payload");
      if (raw) {
        try {
          payload = JSON.parse(raw);
        } catch {
          /* ignore */
        }
      }
      track(name, {
        ...payload,
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.trim().slice(0, 80),
      });
    },
    { capture: true },
  );

  // Flush pending events on page hide.
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush();
  });

  track("app_loaded", { referrer: document.referrer });
}

/** Track SPA route changes. Call from a router.subscribe hook. */
export function trackRouteChange(to: string, from?: string) {
  track("route_change", { to, from });
}
