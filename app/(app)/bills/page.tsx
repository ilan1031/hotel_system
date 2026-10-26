"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Clock, Loader2, Printer, Receipt, ShoppingBag, Wallet } from "lucide-react";
import { useLive } from "@/components/live";
import { useConfirm } from "@/components/confirm";
import { GuestHistory } from "@/components/history";
import { Btn, Sheet } from "@/components/ui";
import { api, minsSince } from "@/lib/client";
import { guestPlace, guestTotal, isTakeaway, rupee, type Guest, type Order } from "@/lib/types";

type Bill = Guest & { table: string; orders: Order[] };

export default function BillsPage() {
  const { state, act } = useLive();
  const confirm = useConfirm();
  const [day, setDay] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [history, setHistory] = useState<{ bills: Bill[]; total: number } | null>(null);
  const [open, setOpen] = useState<Bill | null>(null);
  const v = state?.v;

  useEffect(() => {
    if (v === undefined) return;
    api<{ bills: Bill[]; total: number }>(`/api/bills?day=${day}`).then(setHistory).catch(() => {});
  }, [day, v]);

  if (!state) return <Loader2 className="mx-auto mt-24 size-8 animate-spin text-maroon" />;

  // Only billed guests wait here for payment; their table is already free for new diners.
  const live: Bill[] = state.guests
    .filter((g) => g.status === "bill")
    .map((g) => ({
      ...g,
      table: guestPlace(g, state.tables, false),
      orders: state.orders
        .filter((o) => o.guestId === g.id && o.status !== "cancelled")
        .map((o) => ({ ...o, lines: o.lines.filter((l) => l.status !== "cancelled") })),
    }))
    .sort((a, b) => (a.billedAt ?? 0) - (b.billedAt ?? 0));
  const current = open && (live.find((b) => b.id === open.id) ?? open);

  return (
    <>
      <header className="mb-3 flex items-center gap-3">
        <Receipt className="size-7 text-maroon" />
        <span className="rounded-full bg-rose-700 px-3 py-1 text-sm font-bold text-white">{live.length}</span>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <AnimatePresence>
          {live.map((b) => (
            <motion.button
              key={b.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setOpen(b)}
              className="rounded-2xl bg-rose-700 p-4 text-left text-white shadow-sm shadow-rose-700/30"
            >
              <div className="flex items-center gap-2">
                {isTakeaway(b) && <ShoppingBag className="size-5" />}
                <span className="font-display text-2xl font-extrabold">{b.table}</span>
                {!isTakeaway(b) && <span className="text-sm font-bold opacity-70">{b.label}</span>}
                <span className="ml-auto flex items-center gap-1 text-xs opacity-80">
                  <Clock className="size-3" />
                  {minsSince(b.billedAt ?? b.openedAt)}m
                </span>
              </div>
              <p className="mt-2 text-xl font-bold">{rupee(b.total ?? guestTotal(b.id, state.orders))}</p>
            </motion.button>
          ))}
        </AnimatePresence>
        {!live.length && <p className="col-span-full py-8 text-center text-stone-400">—</p>}
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm">
            <CalendarDays className="size-4 text-stone-500" />
            <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="bg-transparent text-sm outline-none" />
          </label>
          <span className="ml-auto rounded-full bg-emerald-600 px-4 py-1.5 font-bold text-white">
            {history ? rupee(history.total) : "…"}
            <span className="ml-2 text-sm font-medium opacity-80">· {history?.bills.length ?? 0}</span>
          </span>
        </div>
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
          {history?.bills.map((b) => (
            <button
              key={b.id}
              onClick={() => setOpen(b)}
              className="flex w-full items-center gap-3 border-b border-stone-100 px-4 py-3 text-left last:border-0 hover:bg-stone-50"
            >
              <span className="w-14 font-display text-lg font-bold">{b.table}</span>
              <span className="text-sm text-stone-500">
                {new Date(b.closedAt!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="ml-auto font-bold">{rupee(b.total ?? 0)}</span>
            </button>
          ))}
          {history && !history.bills.length && <p className="py-6 text-center text-stone-400">—</p>}
        </div>
      </section>

      <Sheet
        open={!!current}
        onClose={() => setOpen(null)}
        title={
          current && (
            <div className="flex items-center gap-1">
              <span className="font-display text-2xl font-extrabold text-maroon">{current.table}</span>
              <GuestHistory guest={current} orders={current.orders} title={current.table} />
            </div>
          )
        }
        footer={
          current && (
            <div className="flex gap-2">
              <Btn tone="ghost" onClick={() => window.print()}>
                <Printer className="size-5" />
              </Btn>
              {current.status === "bill" && (
                <Btn
                  tone="green"
                  className="flex-1"
                  onClick={async () => {
                    const amount = rupee(current.total ?? guestTotal(current.id, state.orders));
                    if (!(await confirm({ title: `${amount} paid?`, detail: current.table, yes: "Paid", tone: "green" }))) return;
                    if (await act(`/api/guests/${current.id}`, "PATCH", { action: "settle" }, "Paid")) setOpen(null);
                  }}
                >
                  <Wallet className="size-5" /> Paid
                </Btn>
              )}
            </div>
          )
        }
      >
        {current && <BillReceipt bill={current} />}
      </Sheet>
    </>
  );
}

function BillReceipt({ bill }: { bill: Bill }) {
  // merge identical dishes across tickets
  const merged = new Map<string, { name: string; price: number; qty: number }>();
  bill.orders.forEach((o) =>
    o.lines.forEach((l) => {
      if (l.status === "cancelled") return;
      const k = `${l.itemId}:${l.price}`;
      const m = merged.get(k) ?? { name: l.name, price: l.price, qty: 0 };
      m.qty += l.qty;
      merged.set(k, m);
    }),
  );
  const total = [...merged.values()].reduce((s, m) => s + m.qty * m.price, 0);
  const when = new Date(bill.closedAt ?? bill.billedAt ?? bill.openedAt);

  return (
    <div className="print-area rounded-2xl bg-white p-4 font-mono text-sm ring-1 ring-stone-200">
      <div className="mb-3 flex flex-col items-center text-center">
        <Image src="/logo.jpg" alt="" width={64} height={80} className="mb-1" />
        <p className="font-sans font-bold">Periya Veedu · அசைவ விருந்து</p>
        <p className="text-xs text-stone-500">
          {bill.table}
{isTakeaway(bill) ? " · Parcel" : ` · ${bill.label}`} · {when.toLocaleDateString()} {when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
      <table className="w-full">
        <tbody>
          {[...merged.values()].map((m, i) => (
            <tr key={i} className="align-top">
              <td className="py-0.5 pr-2">{m.name}</td>
              <td className="py-0.5 text-right tabular-nums">{m.qty}</td>
              <td className="w-20 py-0.5 text-right tabular-nums">{(m.qty * m.price).toLocaleString("en-IN")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex justify-between border-t border-dashed border-stone-400 pt-2 text-base font-bold">
        <span>Total</span>
        <span>{rupee(total)}</span>
      </div>
      <p className="mt-3 text-center text-xs text-stone-500">நன்றி · Thank you</p>
    </div>
  );
}
