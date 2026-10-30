"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { DuoIcon } from "@/components/ui/DuoIcon";
import { FALLBACK_META, NOTIFICATION_META, notificationHref } from "@/lib/notification-meta";
import styles from "./live.module.css";

type Counts = { unread: number; invites: number };
type Toast = { id: string; type: string; message: string; createdAt: string; projectId: string | null; taskId: string | null };
type Snapshot = Counts & { cursor: string; toasts: Toast[] };
type Initial = Counts & { cursor: string; seen: string[] };

const LiveContext = createContext<Counts>({ unread: 0, invites: 0 });
/** The live badge numbers (unread notifications and pending invitations). */
export const useLive = () => useContext(LiveContext);

const POLL_MS = 4000; // while you are looking at the page
const HIDDEN_POLL_MS = 20_000; // while the tab is in the background
const REFRESH_GAP_MS = 2500;
const TOAST_MS = 7000;

/**
 * Keeps the signed-in app current without any refreshing, like a chat app:
 * it checks for news every few seconds (instantly when you come back to the tab or the internet returns),
 * updates every badge, pops up a card for each new notification, and refreshes the page you are on.
 */
export function LiveProvider({ initial, children }: { initial: Initial; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [counts, setCounts] = useState<Counts>({ unread: initial.unread, invites: initial.invites });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const countsRef = useRef(counts);
  countsRef.current = counts;
  const cursor = useRef(initial.cursor);
  const seen = useRef(new Set(initial.seen));

  // after you do something yourself (the page re-renders with fresh numbers), use those straight away
  useEffect(() => {
    setCounts({ unread: initial.unread, invites: initial.invites });
  }, [initial.unread, initial.invites]);

  useEffect(() => {
    let stopped = false;
    let inFlight = false;
    let failures = 0;
    let lastRefresh = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;

    const refreshSoon = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        lastRefresh = Date.now();
        router.refresh();
      }, Math.max(0, REFRESH_GAP_MS - (Date.now() - lastRefresh)));
    };

    const schedule = () => {
      if (stopped) return;
      const wait = document.hidden ? HIDDEN_POLL_MS : Math.min(POLL_MS * 2 ** failures, 30_000);
      timer = setTimeout(tick, wait);
    };

    async function tick() {
      if (stopped || inFlight) return;
      inFlight = true;
      try {
        if (!navigator.onLine) throw new Error("offline");
        const res = await fetch(`/api/live?cursor=${encodeURIComponent(cursor.current)}`, { cache: "no-store", credentials: "same-origin" });
        if (res.status === 401) {
          stopped = true;
          router.push("/login?expired=1");
          return;
        }
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as Snapshot;
        failures = 0;

        const fresh = data.toasts.filter((t) => !seen.current.has(t.id));
        data.toasts.forEach((t) => seen.current.add(t.id));
        if (seen.current.size > 200) seen.current = new Set([...seen.current].slice(-100));

        const changed = data.unread !== countsRef.current.unread || data.invites !== countsRef.current.invites || data.cursor !== cursor.current || fresh.length > 0;
        cursor.current = data.cursor;
        setCounts({ unread: data.unread, invites: data.invites });
        if (fresh.length > 0) setToasts((current) => [...current, ...fresh].slice(-4));
        if (changed) refreshSoon();
      } catch {
        failures = Math.min(failures + 1, 4);
      } finally {
        inFlight = false;
        schedule();
      }
    }

    const wake = () => {
      if (document.hidden) return;
      clearTimeout(timer);
      void tick();
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("focus", wake);
    window.addEventListener("online", wake);
    timer = setTimeout(tick, 1500);
    return () => {
      stopped = true;
      clearTimeout(timer);
      clearTimeout(refreshTimer);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("focus", wake);
      window.removeEventListener("online", wake);
    };
  }, [router]);

  // "(3) Dashboard | Maplecake" in the browser tab, so you notice news while working elsewhere
  useEffect(() => {
    const total = counts.unread + counts.invites;
    const apply = () => {
      const base = document.title.replace(/^\(\d+\)\s/, "");
      const next = total > 0 ? `(${total}) ${base}` : base;
      if (document.title !== next) document.title = next;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [counts, pathname]);

  const dismiss = (id: string) => setToasts((current) => current.filter((t) => t.id !== id));

  return (
    <LiveContext.Provider value={counts}>
      {children}
      <div className={styles.stack} role="region" aria-label="New notifications" aria-live="polite">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDone={() => dismiss(toast.id)} />
        ))}
      </div>
    </LiveContext.Provider>
  );
}

function ToastCard({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const meta = NOTIFICATION_META[toast.type] ?? FALLBACK_META;
  const hovered = useRef(false);

  const close = () => {
    setLeaving(true);
    setTimeout(onDone, 250);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      if (!hovered.current) {
        clearInterval(timer);
        setLeaving(true);
        setTimeout(onDone, 250);
      }
    }, TOAST_MS);
    return () => clearInterval(timer);
  }, [onDone]);

  return (
    <div onMouseEnter={() => (hovered.current = true)} onMouseLeave={() => (hovered.current = false)} style={{ position: "relative" }}>
      <Link href={notificationHref(toast)} className={`${styles.toast} ${leaving ? styles.toastOut : ""}`} onClick={close}>
        <span className={styles.icon}>
          <DuoIcon name={meta.name} tone={meta.tone} size="1em" />
        </span>
        <span>
          <span className={styles.title}>{meta.title}</span>
          <span className={styles.message} style={{ display: "block" }}>{toast.message}</span>
          <span className={styles.when} style={{ display: "block" }}>just now</span>
        </span>
      </Link>
      <button type="button" className={styles.close} aria-label="Dismiss" onClick={close} style={{ pointerEvents: "auto", zIndex: 1 }}>
        <i className="ri-close-line" aria-hidden="true" />
      </button>
    </div>
  );
}
