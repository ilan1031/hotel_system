"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";

type Ask = {
  title: string;
  detail?: string;
  yes?: string;
  no?: string;
  /** red for destructive actions, green for money/finishing actions */
  tone?: "red" | "green" | "primary";
};

const ConfirmCtx = createContext<((a: Ask) => Promise<boolean>) | null>(null);

/** `await confirm({ title })` → true on Yes, false on No / tap outside / Esc. */
export function useConfirm() {
  const c = useContext(ConfirmCtx);
  if (!c) throw new Error("useConfirm outside provider");
  return c;
}

const TONE = {
  red: "bg-rose-700 shadow-rose-700/30",
  green: "bg-emerald-600 shadow-emerald-600/30",
  primary: "bg-maroon shadow-maroon/30",
};

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [ask, setAsk] = useState<Ask | null>(null);
  const resolver = useRef<(v: boolean) => void>(null);

  const confirm = useCallback((a: Ask) => {
    resolver.current?.(false);
    setAsk(a);
    return new Promise<boolean>((r) => (resolver.current = r));
  }, []);

  const answer = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setAsk(null);
  };

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {ask && (
          <div
            className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-4"
            onKeyDown={(e) => e.key === "Escape" && answer(false)}
          >
            <motion.div
              className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => answer(false)}
            />
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              initial={{ y: 60, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className="pb-safe relative w-full rounded-t-3xl bg-paper p-5 text-center shadow-2xl sm:max-w-sm sm:rounded-3xl"
            >
              <h3 id="confirm-title" className="text-xl font-bold">
                {ask.title}
              </h3>
              {ask.detail && <p className="mt-1 text-stone-500">{ask.detail}</p>}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  onClick={() => answer(false)}
                  className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-white text-lg font-bold text-ink ring-1 ring-stone-300 active:scale-[0.97]"
                >
                  <X className="size-6" /> {ask.no ?? "No"}
                </button>
                <button
                  autoFocus
                  onClick={() => answer(true)}
                  className={`flex h-14 items-center justify-center gap-2 rounded-2xl text-lg font-bold text-white shadow-lg active:scale-[0.97] ${
                    TONE[ask.tone ?? "red"]
                  }`}
                >
                  <Check className="size-6" /> {ask.yes ?? "Yes"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmCtx.Provider>
  );
}
