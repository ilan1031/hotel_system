"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CheckCheck, ChefHat, Clock, Flame, Loader2, ShoppingBag, Undo2, X } from "lucide-react";
import { useLive } from "@/components/live";
import { OrderHistory } from "@/components/history";
import { minsSince, useNow } from "@/lib/client";
import { isTakeaway, type LiveState, type Order, type OrderLine } from "@/lib/types";

export default function KitchenPage() {
  const { state, act } = useLive();
  const [tab, setTab] = useState<"waiting" | "ready">("waiting");
  const [dish, setDish] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useNow(15000);

  if (!state) return <Loader2 className="mx-auto mt-24 size-8 animate-spin text-maroon" />;

  const has = (o: Order, st: string) => o.lines.some((l) => l.status === st);
  const firstReady = (o: Order) => Math.min(...o.lines.filter((l) => l.status === "ready").map((l) => l.readyAt ?? 0));
  // tickets with any dish not yet started or still on the stove
  const waiting = state.orders
    .filter((o) => has(o, "waiting") || has(o, "cooking"))
    .sort((a, b) => a.createdAt - b.createdAt);
  const ready = state.orders.filter((o) => has(o, "ready")).sort((a, b) => firstReady(a) - firstReady(b));

  // per dish: how many still to start, and how many on the stove
  const toCook = new Map<string, { wait: number; cook: number }>();
  waiting.forEach((o) =>
    o.lines.forEach((l) => {
      if (l.status !== "waiting" && l.status !== "cooking") return;
      const t = toCook.get(l.name) ?? { wait: 0, cook: 0 };
      if (l.status === "waiting") t.wait += l.qty;
      else t.cook += l.qty;
      toCook.set(l.name, t);
    }),
  );

  // tapping a dish chip shows only tickets that still need that dish, with batch Start / Ready
  const focus = dish && toCook.has(dish) ? dish : null;
  const shown = focus
    ? waiting.filter((o) => o.lines.some((l) => l.name === focus && (l.status === "waiting" || l.status === "cooking")))
    : waiting;
  const focusCount = focus ? toCook.get(focus)! : null;

  async function batch(status: "cooking" | "ready") {
    const from = status === "cooking" ? ["waiting"] : ["waiting", "cooking"];
    setBusy(true);
    for (const o of shown) {
      const lineIds = o.lines.filter((l) => l.name === focus && from.includes(l.status)).map((l) => l.id);
      if (lineIds.length) await act(`/api/orders/${o.id}`, "PATCH", { status, lineIds });
    }
    setBusy(false);
  }

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
                  className={`absolute inset-0 rounded-full ${t === "waiting" ? "bg-orange-600" : "bg-emerald-600"}`}
                />
              )}
              <span className="relative">{t === "waiting" ? <Flame className="size-4" /> : <Check className="size-4" />}</span>
              <span className="relative tabular-nums">{t === "waiting" ? waiting.length : ready.length}</span>
            </button>
          ))}
        </div>
      </header>

      {toCook.size > 0 && (
        <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto pb-1">
          {focus && (
            <button
              onClick={() => setDish(null)}
              className="flex shrink-0 items-center gap-1 rounded-xl bg-ink px-3 py-1.5 text-sm font-semibold text-white"
              aria-label="Show all dishes"
            >
              <X className="size-4" /> All
            </button>
          )}
          {[...toCook]
            .sort((a, b) => b[1].wait + b[1].cook - (a[1].wait + a[1].cook))
            .map(([name, { wait, cook }]) => {
              const on = name === focus;
              return (
                <motion.button
                  key={name}
                  layout
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setDish(on ? null : name)}
                  aria-pressed={on}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm shadow-sm transition ${
                    on ? "bg-maroon text-white ring-2 ring-maroon" : "bg-white ring-1 ring-amber-200 hover:ring-maroon"
                  }`}
                >
                  {wait > 0 && <b className={`tabular-nums ${on ? "" : "text-amber-700"}`}>{wait}</b>}
                  {cook > 0 && (
                    <b className={`flex items-center gap-0.5 tabular-nums ${on ? "" : "text-orange-600"}`}>
                      <Flame className="size-3.5" />
                      {cook}
                    </b>
                  )}
                  {name}
                </motion.button>
              );
            })}
        </div>
      )}

      <AnimatePresence>
        {focus && focusCount && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-white p-2 pl-4 shadow-sm ring-1 ring-stone-200"
          >
            <span className="mr-auto font-bold">{focus}</span>
            <button
              disabled={busy || !focusCount.wait}
              onClick={() => batch("cooking")}
              className="flex h-11 items-center gap-1.5 rounded-xl bg-orange-600 px-4 font-bold text-white disabled:opacity-30"
              aria-label={`Start cooking all ${focus}`}
            >
              <Flame className="size-5" /> Start {focusCount.wait || ""}
            </button>
            <button
              disabled={busy}
              onClick={() => batch("ready")}
              className="flex h-11 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 font-bold text-white disabled:opacity-30"
              aria-label={`All ${focus} ready`}
            >
              <Check className="size-5" /> Ready {focusCount.wait + focusCount.cook}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className={tab === "waiting" ? "" : "hidden lg:block"}>
          <h2 className="mb-2 hidden items-center gap-2 font-bold text-orange-700 lg:flex">
            <Flame className="size-5" /> {shown.length}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence>
              {shown.map((o) => (
                <Ticket key={o.id} order={o} state={state} mode="cooking" focus={focus} />
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

function Ticket({
  order: o,
  state,
  mode,
  focus,
}: {
  order: Order;
  state: LiveState;
  mode: "cooking" | "ready";
  focus?: string | null;
}) {
  const { act } = useLive();
  const table = state.tables.find((t) => t.id === o.tableId);
  const guest = state.guests.find((g) => g.id === o.guestId);
  const parcel = isTakeaway(guest);
  const split = !parcel && state.guests.filter((g) => g.tableId === o.tableId && g.status === "open").length > 1;
  const mins = minsSince(o.createdAt);
  const isReady = mode === "ready";
  const set = (status: string, lineIds: string[]) => {
    if (lineIds.length) act(`/api/orders/${o.id}`, "PATCH", { status, lineIds });
  };
  // kitchen tickets list dishes to start, on the stove and already done; ready tickets list plates to pick up
  const lines = o.lines.filter((l) =>
    isReady ? l.status === "ready" : l.status === "waiting" || l.status === "cooking" || l.status === "ready",
  );
  const toStart = lines.filter((l) => l.status === "waiting").map((l) => l.id);
  const notReady = lines.filter((l) => l.status === "waiting" || l.status === "cooking").map((l) => l.id);
  const cooking = lines.some((l) => l.status === "cooking");
  const head = isReady ? "bg-emerald-600" : mins >= 15 ? "bg-rose-700" : cooking ? "bg-orange-600" : "bg-amber-500";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, x: 60 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-stone-200"
    >
      <div className={`flex items-center gap-2 py-2 pr-2 pl-4 text-white transition-colors ${head}`}>
        {parcel && <ShoppingBag className="size-6" aria-label="Takeaway" />}
        <span className="font-display text-2xl font-extrabold">{parcel ? guest?.label : table?.name}</span>
        {split && <span className="rounded-md bg-white/25 px-1.5 text-sm font-bold">{guest?.label}</span>}
        <span className="text-sm opacity-80">#{o.no}</span>
        <span className="ml-auto flex items-center gap-1 text-sm font-bold">
          <Clock className="size-4" />
          {mins}m
        </span>
        <OrderHistory order={o} light />
      </div>

      {isReady ? (
        <ul className="px-2 py-1">
          {lines.map((l) => (
            <li key={l.id}>
              <button
                onClick={() => set("cooking", [l.id])}
                aria-label={`${l.name}: back to cooking`}
                className="flex w-full items-start gap-2 rounded-xl px-2 py-1 text-left text-sm active:scale-[0.98]"
              >
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white">
                  <Check className="size-4" />
                </span>
                <span className="min-w-0 flex-1 leading-snug">
                  <b className="mr-1.5 tabular-nums">{l.qty}×</b>
                  {l.name}
                </span>
                <Undo2 className="mt-0.5 size-4 shrink-0 text-stone-300" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-stone-100 px-2 py-1">
          {lines.map((l) => (
            <KitchenLine
              key={l.id}
              line={l}
              dim={!!focus && l.name !== focus}
              onNext={() => set(l.status === "waiting" ? "cooking" : "ready", [l.id])}
              onBack={() => set(l.status === "cooking" ? "waiting" : "cooking", [l.id])}
            />
          ))}
        </ul>
      )}

      {!isReady && (toStart.length > 1 || notReady.length > 1) && (
        <div className="grid grid-cols-2 border-t border-stone-100">
          <button
            disabled={toStart.length < 2}
            onClick={() => set("cooking", toStart)}
            aria-label="Start cooking all"
            className="flex h-12 items-center justify-center gap-2 bg-orange-50 font-bold text-orange-700 transition hover:bg-orange-600 hover:text-white disabled:opacity-30"
          >
            <Flame className="size-5" /> All
          </button>
          <button
            disabled={notReady.length < 2}
            onClick={() => set("ready", notReady)}
            aria-label="All ready"
            className="flex h-12 items-center justify-center gap-2 border-l border-stone-100 bg-emerald-50 font-bold text-emerald-700 transition hover:bg-emerald-600 hover:text-white disabled:opacity-30"
          >
            <CheckCheck className="size-5" /> All
          </button>
        </div>
      )}
    </motion.article>
  );
}

/** One dish: ordered → (Start) → cooking → (Ready) → ready. The small ↶ steps back one stage. */
function KitchenLine({
  line: l,
  dim,
  onNext,
  onBack,
}: {
  line: OrderLine;
  dim?: boolean;
  onNext: () => void;
  onBack: () => void;
}) {
  const done = l.status === "ready";
  const cooking = l.status === "cooking";
  return (
    <li className={`flex items-center gap-2 py-1.5 transition-opacity ${dim ? "opacity-35" : ""}`}>
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${
          done ? "bg-emerald-600 text-white" : cooking ? "bg-orange-600 text-white" : "bg-amber-100 ring-1 ring-amber-300"
        }`}
      >
        {done ? <Check className="size-4" /> : cooking ? <Flame className="size-4 animate-pulse" /> : null}
      </span>
      <span className={`min-w-0 flex-1 text-lg leading-snug ${done ? "text-stone-400 line-through" : ""}`}>
        <b className="mr-1.5 tabular-nums">{l.qty}×</b>
        {l.name}
        {l.note && <span className="block text-sm text-rose-700 italic">{l.note}</span>}
      </span>
      {l.status !== "waiting" && (
        <button
          onClick={onBack}
          className="rounded-full p-1.5 text-stone-300 hover:bg-stone-100 hover:text-stone-500"
          aria-label={`${l.name}: step back`}
        >
          <Undo2 className="size-4" />
        </button>
      )}
      {!done && (
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={onNext}
          aria-label={cooking ? `${l.name} ready` : `Start cooking ${l.name}`}
          className={`flex h-11 min-w-24 items-center justify-center gap-1.5 rounded-xl px-3 font-bold text-white shadow-sm ${
            cooking ? "bg-emerald-600" : "bg-orange-600"
          }`}
        >
          {cooking ? <Check className="size-5" /> : <Flame className="size-5" />}
          {cooking ? "Ready" : "Start"}
        </motion.button>
      )}
    </li>
  );
}
