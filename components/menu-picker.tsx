"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ChevronUp, Loader2, Minus, MessageSquarePlus, Plus, Search, Send } from "lucide-react";
import { useLive } from "./live";
import { Btn } from "./ui";
import { rupee, type MenuItem } from "@/lib/types";

export type PickTarget = { guestId?: string; tableId?: string; takeaway?: boolean; title: string };
type Cart = Record<string, { qty: number; note?: string }>;

export function MenuPicker({
  target,
  onClose,
  onPlaced,
}: {
  target: PickTarget | null;
  onClose: () => void;
  onPlaced: (guestId?: string) => void;
}) {
  const { state, act } = useLive();
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<Cart>({});
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (target) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCart({});
      setReview(false);
      setQ("");
    }
  }, [target]);

  const menu = useMemo(() => state?.menu ?? [], [state?.menu]);
  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    return menu.filter(
      (m) =>
        m.available &&
        (s ? m.name.toLowerCase().includes(s) || m.nameTa?.includes(s) : cat === "all" || m.categoryId === cat),
    );
  }, [menu, cat, q]);

  const lines = Object.entries(cart).filter(([, v]) => v.qty > 0);
  const count = lines.reduce((s, [, v]) => s + v.qty, 0);
  const total = lines.reduce((s, [id, v]) => s + (menu.find((m) => m.id === id)?.price ?? 0) * v.qty, 0);

  const add = (id: string, d: number) =>
    setCart((c) => {
      const qty = Math.max(0, (c[id]?.qty ?? 0) + d);
      return { ...c, [id]: { ...c[id], qty } };
    });

  async function send() {
    if (!target || !count) return;
    setBusy(true);
    const order = await act<{ guestId: string }>(
      "/api/orders",
      "POST",
      { guestId: target.guestId, tableId: target.tableId, takeaway: target.takeaway, lines: lines.map(([itemId, v]) => ({ itemId, ...v })) },
      "Sent to kitchen",
    );
    setBusy(false);
    if (order) {
      onPlaced(order.guestId);
      onClose();
    }
  }

  return (
    <AnimatePresence>
      {target && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: "spring", stiffness: 380, damping: 36 }}
          className="bg-kolam fixed inset-0 z-[70] flex flex-col"
        >
          {/* header */}
          <div className="shrink-0 border-b border-gold/30 bg-paper/95 px-3 pt-3 pb-2 backdrop-blur sm:px-5">
            <div className="mb-2 flex items-center gap-2">
              <button onClick={onClose} className="rounded-full p-2 hover:bg-stone-100" aria-label="Back">
                <ArrowLeft className="size-6" />
              </button>
              <span className="font-display text-xl font-extrabold text-maroon">{target.title}</span>
              <label className="ml-auto flex h-10 w-40 items-center gap-2 rounded-full bg-white px-3 ring-1 ring-stone-200 focus-within:ring-maroon sm:w-64">
                <Search className="size-4 text-stone-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </label>
            </div>
            <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 sm:-mx-5 sm:px-5">
              {[{ id: "all", name: "All" }, ...(state?.categories ?? [])].map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setCat(c.id);
                    setQ("");
                  }}
                  className={`relative shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold ${
                    cat === c.id && !q ? "text-white" : "bg-white text-stone-600 ring-1 ring-stone-200"
                  }`}
                >
                  {cat === c.id && !q && <motion.span layoutId="cat-pill" className="absolute inset-0 rounded-full bg-maroon" />}
                  <span className="relative">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* items */}
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 pb-32 sm:px-5">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {items.map((m) => (
                <ItemTile key={m.id} item={m} qty={cart[m.id]?.qty ?? 0} onAdd={(d) => add(m.id, d)} />
              ))}
            </div>
          </div>

          {/* cart bar */}
          <AnimatePresence>
            {count > 0 && (
              <motion.div
                initial={{ y: 120 }}
                animate={{ y: 0 }}
                exit={{ y: 120 }}
                transition={{ type: "spring", stiffness: 400, damping: 34 }}
                className="pb-safe absolute inset-x-0 bottom-0 rounded-t-3xl bg-ink text-white shadow-2xl"
              >
                <AnimatePresence>
                  {review && (
                    <motion.ul
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="max-h-[45dvh] overflow-y-auto px-4 sm:px-6"
                    >
                      {lines.map(([id, v]) => {
                        const m = menu.find((x) => x.id === id)!;
                        return (
                          <li key={id} className="border-b border-white/10 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="min-w-0 flex-1 truncate">{m.name}</span>
                              <Stepper qty={v.qty} onAdd={(d) => add(id, d)} dark />
                            </div>
                            <label className="mt-1 flex items-center gap-2 text-white/60">
                              <MessageSquarePlus className="size-4" />
                              <input
                                value={v.note ?? ""}
                                maxLength={80}
                                placeholder="note"
                                onChange={(e) => setCart((c) => ({ ...c, [id]: { ...c[id], note: e.target.value } }))}
                                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                              />
                            </label>
                          </li>
                        );
                      })}
                    </motion.ul>
                  )}
                </AnimatePresence>
                <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
                  <button onClick={() => setReview(!review)} className="flex items-center gap-2" aria-label="Review cart">
                    <motion.span
                      key={count}
                      initial={{ scale: 1.4 }}
                      animate={{ scale: 1 }}
                      className="flex size-9 items-center justify-center rounded-full bg-gold font-bold text-ink"
                    >
                      {count}
                    </motion.span>
                    <span className="text-lg font-bold">{rupee(total)}</span>
                    <ChevronUp className={`size-5 transition ${review ? "rotate-180" : ""}`} />
                  </button>
                  <Btn tone="green" size="lg" className="ml-auto" onClick={send} disabled={busy}>
                    {busy ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
                    Send
                  </Btn>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ItemTile({ item, qty, onAdd }: { item: MenuItem; qty: number; onAdd: (d: number) => void }) {
  return (
    <motion.div
      layout
      whileTap={{ scale: 0.96 }}
      onClick={() => onAdd(1)}
      className={`relative flex min-h-24 cursor-pointer flex-col rounded-2xl bg-white p-3 shadow-sm ring-1 transition select-none ${
        qty ? "ring-2 ring-maroon" : "ring-stone-200"
      }`}
    >
      <span
        className={`absolute top-3 right-3 flex size-3.5 items-center justify-center rounded-sm border-2 ${
          item.veg ? "border-emerald-600" : "border-rose-700"
        }`}
      >
        <span className={`size-1.5 rounded-full ${item.veg ? "bg-emerald-600" : "bg-rose-700"}`} />
      </span>
      <span className="pr-5 leading-tight font-semibold">{item.name}</span>
      {item.nameTa && <span className="mt-0.5 text-xs leading-tight text-stone-500">{item.nameTa}</span>}
      <div className="mt-auto flex items-center pt-2">
        <span className="font-bold text-maroon">{rupee(item.price)}</span>
        {qty > 0 && (
          <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
            <Stepper qty={qty} onAdd={onAdd} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Stepper({ qty, onAdd, dark }: { qty: number; onAdd: (d: number) => void; dark?: boolean }) {
  const btn = `flex size-8 items-center justify-center rounded-full ${dark ? "bg-white/15" : "bg-maroon/10 text-maroon"}`;
  return (
    <div className="flex items-center gap-1.5">
      <button className={btn} onClick={() => onAdd(-1)} aria-label="Less">
        <Minus className="size-4" />
      </button>
      <motion.span key={qty} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-5 text-center font-bold tabular-nums">
        {qty}
      </motion.span>
      <button className={btn} onClick={() => onAdd(1)} aria-label="More">
        <Plus className="size-4" />
      </button>
    </div>
  );
}
