"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CheckCheck, ChefHat, Clock, Flame, Loader2, ShoppingBag, Undo2 } from "lucide-react";
import { useLive } from "@/components/live";
import { minsSince, useNow } from "@/lib/client";
import { isTakeaway, type LiveState, type Order } from "@/lib/types";

export default function KitchenPage() {
  const { state } = useLive();
  const [tab, setTab] = useState<"waiting" | "ready">("waiting");
  useNow(15000);

  if (!state) return <Loader2 className="mx-auto mt-24 size-8 animate-spin text-maroon" />;

  const has = (o: Order, st: string) => o.lines.some((l) => l.status === st);
  const firstReady = (o: Order) => Math.min(...o.lines.filter((l) => l.status === "ready").map((l) => l.readyAt ?? 0));
  const waiting = state.orders.filter((o) => has(o, "waiting")).sort((a, b) => a.createdAt - b.createdAt);
  const ready = state.orders.filter((o) => has(o, "ready")).sort((a, b) => firstReady(a) - firstReady(b));

  // total quantity per dish still to cook
  const toCook = new Map<string, number>();
  waiting.forEach((o) =>
    o.lines.forEach((l) => l.status === "waiting" && toCook.set(l.name, (toCook.get(l.name) ?? 0) + l.qty)),
  );

  return (
    <>
      <header className="mb-3 flex items-center gap-3">
        <ChefHat className="size-7 text-maroon" />
        <div className="flex rounded-full bg-white p-1 shadow-sm lg:hidden">
          {(["waiting", "ready"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold ${tab === t ? "text-white" : "text-stone-600"}`}
            >
              {tab === t && (
                <motion.span
                  layoutId="k-tab"
                  className={`absolute inset-0 rounded-full ${t === "waiting" ? "bg-amber-500" : "bg-emerald-600"}`}
                />
              )}
              <span className="relative">{t === "waiting" ? <Flame className="size-4" /> : <Check className="size-4" />}</span>
              <span className="relative tabular-nums">{t === "waiting" ? waiting.length : ready.length}</span>
            </button>
          ))}
        </div>
      </header>

      {toCook.size > 0 && (
        <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
          {[...toCook].sort((a, b) => b[1] - a[1]).map(([name, qty]) => (
            <span key={name} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-sm shadow-sm ring-1 ring-amber-200">
              <b className="text-amber-700 tabular-nums">{qty}</b>
              {name}
            </span>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className={tab === "waiting" ? "" : "hidden lg:block"}>
          <h2 className="mb-2 hidden items-center gap-2 font-bold text-amber-700 lg:flex">
            <Flame className="size-5" /> {waiting.length}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence>
              {waiting.map((o) => (
                <Ticket key={o.id} order={o} state={state} mode="cooking" />
              ))}
            </AnimatePresence>
          </div>
          {!waiting.length && <Empty />}
        </section>

        <section className={tab === "ready" ? "" : "hidden lg:block"}>
          <h2 className="mb-2 hidden items-center gap-2 font-bold text-emerald-700 lg:flex">
            <Check className="size-5" /> {ready.length}
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <AnimatePresence>
              {ready.map((o) => (
                <Ticket key={o.id} order={o} state={state} mode="ready" />
              ))}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </>
  );
}

function Empty() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-20 text-stone-400">
      <motion.div animate={{ rotate: [0, -8, 8, 0] }} transition={{ repeat: Infinity, duration: 3 }}>
        <ChefHat className="size-16" />
      </motion.div>
    </motion.div>
  );
}

function Ticket({ order: o, state, mode }: { order: Order; state: LiveState; mode: "cooking" | "ready" }) {
  const { act } = useLive();
  const table = state.tables.find((t) => t.id === o.tableId);
  const guest = state.guests.find((g) => g.id === o.guestId);
  const parcel = isTakeaway(guest);
  const split = !parcel && state.guests.filter((g) => g.tableId === o.tableId && g.status === "open").length > 1;
  const mins = minsSince(o.createdAt);
  const isReady = mode === "ready";
  const late = !isReady && mins >= 15;
  const head = isReady ? "bg-emerald-600" : late ? "bg-rose-700" : "bg-amber-500";
  const set = (status: string, lineIds?: string[]) => act(`/api/orders/${o.id}`, "PATCH", { status, lineIds });
  // cooking tickets list dishes still on the stove plus ones already done; ready tickets list plates to pick up
  const lines = o.lines.filter((l) => (isReady ? l.status === "ready" : l.status === "waiting" || l.status === "ready"));
  const left = lines.filter((l) => l.status === "waiting").length;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, x: 60 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-stone-200"
    >
      <div className={`flex items-center gap-2 px-4 py-2 text-white ${head}`}>
        {parcel && <ShoppingBag className="size-6" aria-label="Takeaway" />}
        <span className="font-display text-2xl font-extrabold">{parcel ? guest?.label : table?.name}</span>
        {split && <span className="rounded-md bg-white/25 px-1.5 text-sm font-bold">{guest?.label}</span>}
        <span className="text-sm opacity-80">#{o.no}</span>
        <span className="ml-auto flex items-center gap-1 text-sm font-bold">
          <Clock className="size-4" />
          {mins}m
        </span>
      </div>
      <ul className={isReady ? "px-2 py-1" : "px-2 py-2"}>
        {lines.map((l) => {
          const done = l.status === "ready";
          return (
            <li key={l.id}>
              <button
                onClick={() => set(done ? "waiting" : "ready", [l.id])}
                aria-label={done ? `${l.name}: back to cooking` : `${l.name} ready`}
                className={`flex w-full items-start gap-2 rounded-xl px-2 text-left transition active:scale-[0.98] ${
                  isReady ? "py-1 text-sm" : "py-1.5 text-lg hover:bg-emerald-50"
                }`}
              >
                <span
                  className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md ${
                    done ? "bg-emerald-600 text-white" : "bg-amber-100 text-amber-800 ring-1 ring-amber-300"
                  }`}
                >
                  {done ? <Check className="size-4" /> : null}
                </span>
                <span className={`min-w-0 flex-1 leading-snug ${done && !isReady ? "text-stone-400 line-through" : ""}`}>
                  <b className="mr-1.5 tabular-nums">{l.qty}×</b>
                  {l.name}
                  {l.note && <span className="block text-sm text-rose-700 italic">{l.note}</span>}
                </span>
                {isReady && <Undo2 className="mt-0.5 size-4 shrink-0 text-stone-300" />}
              </button>
            </li>
          );
        })}
      </ul>
      {!isReady && left > 1 && (
        <button
          onClick={() => set("ready")}
          className="flex h-12 w-full items-center justify-center gap-2 border-t border-stone-100 bg-emerald-50 font-bold text-emerald-700 transition hover:bg-emerald-600 hover:text-white active:bg-emerald-700 active:text-white"
        >
          <CheckCheck className="size-5" /> All ready
        </button>
      )}
    </motion.article>
  );
}
