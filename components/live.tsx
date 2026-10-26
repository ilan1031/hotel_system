"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";
import { api, chime } from "@/lib/client";
import { ConfirmProvider } from "./confirm";
import type { LiveState, Me, Permission } from "@/lib/types";

type Toast = { id: number; msg: string; ok: boolean };
type Ctx = {
  me: Me | null; // null until the signed-in user has loaded
  state: LiveState | null;
  can: (p: Permission) => boolean;
  refresh: () => Promise<void>;
  /** Call the API, toast errors, refresh live state. Resolves to the response or null on failure. */
  act: <T = unknown>(path: string, method: string, body?: unknown, okMsg?: string) => Promise<T | null>;
  toast: (msg: string, ok?: boolean) => void;
};

const LiveCtx = createContext<Ctx | null>(null);

export function useLive() {
  const c = useContext(LiveCtx);
  if (!c) throw new Error("useLive outside provider");
  return c;
}

// How often screens check for changes. Raise it (e.g. 4000) to cut serverless calls on Vercel.
const POLL_MS = Number(process.env.NEXT_PUBLIC_POLL_MS) || 2500;

export function LiveProvider({ me, children }: { me: Me | null; children: React.ReactNode }) {
  const [state, setState] = useState<LiveState | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const vRef = useRef(-1);
  const seen = useRef<{ waiting: Set<string>; ready: Set<string> } | null>(null);
  const perms = me?.role.permissions;
  const can = useCallback((p: Permission) => !!perms?.includes(p), [perms]);

  const toast = useCallback((msg: string, ok = true) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, msg, ok }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const s = await api<LiveState & { same?: boolean }>(`/api/state?v=${vRef.current}`);
      if (s.same) return;
      vRef.current = s.v;
      // chime on new dishes for the kitchen / newly ready dishes for waiters
      const lines = s.orders.flatMap((o) => o.lines);
      const waiting = new Set(lines.filter((l) => l.status === "waiting").map((l) => l.id));
      const ready = new Set(lines.filter((l) => l.status === "ready").map((l) => l.id));
      if (seen.current) {
        if (can("kitchen.view") && [...waiting].some((id) => !seen.current!.waiting.has(id))) chime(false);
        else if (can("order.serve") && [...ready].some((id) => !seen.current!.ready.has(id))) chime(true);
      }
      seen.current = { waiting, ready };
      setState(s);
    } catch {
      /* offline blip — next poll retries */
    }
  }, [can]);

  useEffect(() => {
    if (!me) return;
    refresh();
    let timer = setInterval(refresh, POLL_MS);
    const onVis = () => {
      clearInterval(timer);
      timer = setInterval(refresh, document.hidden ? POLL_MS * 4 : POLL_MS);
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [me, refresh]);

  const act = useCallback(
    async <T,>(path: string, method: string, body?: unknown, okMsg?: string) => {
      try {
        const r = await api<T>(path, method, body);
        if (okMsg) toast(okMsg);
        await refresh();
        return r;
      } catch (e) {
        toast((e as Error).message, false);
        return null;
      }
    },
    [refresh, toast],
  );

  return (
    <LiveCtx.Provider value={{ me, state, can, refresh, act, toast }}>
      <ConfirmProvider>{children}</ConfirmProvider>
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white shadow-xl ${
                t.ok ? "bg-emerald-600" : "bg-rose-700"
              }`}
            >
              {t.ok ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </LiveCtx.Provider>
  );
}
