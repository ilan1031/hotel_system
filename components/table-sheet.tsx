"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRightLeft,
  Check,
  CheckCheck,
  ChefHat,
  Flame,
  Plus,
  Receipt,
  ShoppingBag,
  Split,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { useLive } from "./live";
import { useConfirm } from "./confirm";
import { Btn, Dot, Modal, Sheet } from "./ui";
import { MenuPicker, type PickTarget } from "./menu-picker";
import { OrderHistory } from "./history";
import {
  guestLight,
  guestLines,
  guestPlace,
  guestTotal,
  isTakeaway,
  LIGHT_META,
  rupee,
  type Guest,
  type Order,
  type OrderLine,
} from "@/lib/types";
import { minsSince } from "@/lib/client";

const LINE_LIGHT = { waiting: "waiting", cooking: "cooking", ready: "ready", served: "served", cancelled: "free" } as const;

/** Orders for one dine-in table (all its customers) or one takeaway parcel. */
export function TableSheet({
  tableId,
  parcelId,
  onClose,
}: {
  tableId?: string | null;
  parcelId?: string | null;
  onClose: () => void;
}) {
  const { state, can, act } = useLive();
  const confirm = useConfirm();
  const [pick, setPick] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<PickTarget | null>(null);
  const [moving, setMoving] = useState(false);

  const table = tableId ? state?.tables.find((t) => t.id === tableId) : undefined;
  const parcel = parcelId ? state?.guests.find((g) => g.id === parcelId && g.status === "open") : undefined;
  // Billed guests have moved to the cashier; only guests still dining or waiting for a parcel show here.
  const guests: Guest[] = parcel
    ? [parcel]
    : (state?.guests ?? [])
        .filter((g) => table && g.tableId === table.id && g.status === "open")
        .sort((a, b) => a.label.localeCompare(b.label));
  const guest = guests.find((g) => g.id === pick) ?? guests[0];
  const place = guest && state ? guestPlace(guest, state.tables, guests.length > 1) : (table?.name ?? "");
  const orders = (state?.orders ?? []).filter((o) => o.guestId === guest?.id).sort((a, b) => a.createdAt - b.createdAt);
  const lines = guest && state ? guestLines(guest.id, state.orders) : [];
  const total = guest && state ? guestTotal(guest.id, state.orders) : 0;
  const allServed = lines.length > 0 && lines.every((l) => l.status === "served");
  const canLeave = !lines.some((l) => l.status === "served") && (!lines.length || can("order.cancel"));

  async function split() {
    const g = await act<{ id: string; label: string }>("/api/guests", "POST", { tableId });
    if (g) {
      setPick(g.id);
      setMenuFor({ guestId: g.id, title: `${table?.name} · ${g.label}` });
    }
  }

  const done = () => {
    setPick(null);
    if (guests.length <= 1) onClose();
  };

  async function bill() {
    if (!guest) return;
    const ok = await confirm({
      title: `Bill ${place}?`,
      detail: `${rupee(total)} · goes to the cashier${isTakeaway(guest) ? "" : " and frees the table"}`,
      yes: "Bill",
      tone: "red",
    });
    if (ok && (await act(`/api/guests/${guest.id}`, "PATCH", { action: "bill" }, `${place} → Bill`))) done();
  }

  async function leave() {
    if (!guest) return;
    const ok = await confirm({
      title: isTakeaway(guest) ? `Cancel ${place}?` : `Remove ${place}?`,
      detail: lines.length ? "Customer changed their mind. All dishes will be cancelled." : undefined,
      yes: "Remove",
      tone: "red",
    });
    if (ok && (await act(`/api/guests/${guest.id}`, "DELETE", undefined, "Removed"))) done();
  }

  return (
    <>
      <Sheet
        open={!!table || !!parcel}
        onClose={onClose}
        title={
          parcel ? (
            <div className="flex items-center gap-2">
              <ShoppingBag className="size-7 text-maroon" />
              <span className="font-display text-3xl font-extrabold text-maroon">{parcel.label}</span>
            </div>
          ) : (
            table && (
              <div className="flex items-center gap-3">
                <span className="font-display text-3xl font-extrabold text-maroon">{table.name}</span>
                <span className="flex items-center gap-1 text-sm text-stone-500">
                  <Users className="size-4" />
                  {table.seats}
                </span>
              </div>
            )
          )
        }
        footer={
          guest && (
            <div className="flex items-center gap-2">
              <div className="mr-auto">
                <p className="text-xs text-stone-500">Total</p>
                <motion.p key={total} initial={{ scale: 1.2 }} animate={{ scale: 1 }} className="text-xl font-extrabold">
                  {rupee(total)}
                </motion.p>
              </div>
              {can("order.take") && (
                <Btn onClick={() => setMenuFor({ guestId: guest.id, title: place })}>
                  <Plus className="size-5" />
                  Add
                </Btn>
              )}
              {can("bill.mark") && (
                <Btn tone="red" disabled={!allServed} onClick={bill}>
                  <Receipt className="size-5" />
                  Bill
                </Btn>
              )}
            </div>
          )
        }
      >
        {table && guests.length === 0 && (
          <div className="flex flex-col items-center py-10 text-center">
            <motion.div
              initial={{ rotate: -8, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              className="mb-6 flex size-24 items-center justify-center rounded-full bg-white shadow-inner ring-2 ring-dashed ring-stone-300"
            >
              <Users className="size-10 text-stone-400" />
            </motion.div>
            {can("order.take") ? (
              <Btn size="lg" onClick={() => setMenuFor({ tableId: table.id, title: `${table.name} · A` })}>
                <Plus className="size-6" /> Order
              </Btn>
            ) : (
              <p className="font-semibold text-stone-500">Free</p>
            )}
          </div>
        )}

        {table && guests.length > 0 && (
          <div className="no-scrollbar -mx-1 mb-3 flex gap-2 overflow-x-auto px-1 py-1">
            {guests.map((g) => {
              const on = g.id === guest?.id;
              return (
                <button
                  key={g.id}
                  onClick={() => setPick(g.id)}
                  className={`relative flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2 font-bold transition ${
                    on ? "bg-ink text-white shadow-lg" : "bg-white text-ink ring-1 ring-stone-200"
                  }`}
                >
                  <Dot light={guestLight(g, state!.orders)} />
                  {g.label}
                  <span className={`text-xs font-medium ${on ? "text-white/70" : "text-stone-400"}`}>
                    {rupee(guestTotal(g.id, state!.orders))}
                  </span>
                </button>
              );
            })}
            {can("order.take") && guests.length < 8 && (
              <button
                onClick={split}
                className="flex shrink-0 items-center gap-1.5 rounded-2xl border-2 border-dashed border-stone-300 px-3 py-2 text-sm font-semibold text-stone-500 hover:border-maroon hover:text-maroon"
                aria-label="Split table: add another customer"
              >
                <Split className="size-4" /> +
              </button>
            )}
          </div>
        )}

        {guest && (
          <>
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {orders.map((o) => (
                  <OrderCard key={o.id} order={o} />
                ))}
              </AnimatePresence>
            </div>

            {lines.length === 0 && (
              <div className="flex flex-col items-center py-8 text-stone-400">
                <ChefHat className="size-10" />
              </div>
            )}

            {can("order.take") && (
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                {canLeave && (
                  <button
                    onClick={leave}
                    className="flex items-center gap-1.5 text-sm font-semibold text-stone-500 hover:text-rose-700"
                  >
                    <UserMinus className="size-4" /> {isTakeaway(guest) ? `Cancel ${guest.label}` : `Remove ${guest.label}`}
                  </button>
                )}
                {!isTakeaway(guest) && lines.length > 0 && (
                  <button
                    onClick={() => setMoving(true)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-stone-500 hover:text-maroon"
                  >
                    <ArrowRightLeft className="size-4" /> Move table
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </Sheet>

      <MenuPicker target={menuFor} onClose={() => setMenuFor(null)} onPlaced={(gid) => gid && setPick(gid)} />

      <Modal open={moving} onClose={() => setMoving(false)} title="Move to">
        <div className="grid grid-cols-4 gap-2">
          {state?.tables
            .filter((t) => t.id !== tableId)
            .map((t) => {
              const n = state.guests.filter((g) => g.tableId === t.id && g.status === "open").length;
              return (
                <button
                  key={t.id}
                  onClick={async () => {
                    if (guest && (await act(`/api/guests/${guest.id}`, "PATCH", { action: "move", tableId: t.id }, `→ ${t.name}`))) {
                      setMoving(false);
                      onClose();
                    }
                  }}
                  className={`aspect-square rounded-2xl font-display text-lg font-bold ${
                    n ? "bg-stone-200 text-stone-600" : "bg-white text-ink ring-1 ring-stone-200"
                  }`}
                >
                  {t.name}
                  {n > 0 && <span className="block font-sans text-[10px]">+{n}</span>}
                </button>
              );
            })}
        </div>
      </Modal>
    </>
  );
}

/** One ticket; every dish has its own status and buttons. */
function OrderCard({ order: o }: { order: Order }) {
  const { can, act } = useLive();
  const confirm = useConfirm();
  const light = LINE_LIGHT[o.status];
  const ready = o.lines.filter((l) => l.status === "ready");
  const set = (status: string, lineIds?: string[], msg?: string) =>
    act(`/api/orders/${o.id}`, "PATCH", { status, lineIds }, msg);

  async function cancel(l: OrderLine) {
    if (await confirm({ title: `Cancel ${l.qty}× ${l.name}?`, yes: "Cancel it", no: "Keep", tone: "red" }))
      set("cancelled", [l.id], "Cancelled");
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -30 }}
      className={`relative overflow-hidden rounded-2xl bg-white pl-4 shadow-sm ring-1 ring-stone-200 ${
        o.status === "cancelled" ? "opacity-50" : ""
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-1.5 ${LIGHT_META[light].bg}`} />
      <div className="flex items-center gap-2 pt-1.5 pr-1.5 text-xs text-stone-500">
        <Dot light={light} className="size-2.5" />#{o.no} · {minsSince(o.createdAt)}m
        <span className="ml-auto" />
        {ready.length > 1 && can("order.serve") && (
          <button
            onClick={() => set("served", undefined, "Served")}
            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 font-bold text-white"
            aria-label="Serve all ready dishes"
          >
            <CheckCheck className="size-4" /> {ready.length}
          </button>
        )}
        <OrderHistory order={o} />
      </div>
      <ul className="divide-y divide-stone-100 pb-1">
        {o.lines.map((l) => (
          <LineRow key={l.id} line={l} onSet={(status) => set(status, [l.id])} onCancel={() => cancel(l)} />
        ))}
      </ul>
    </motion.div>
  );
}

function LineRow({
  line: l,
  onSet,
  onCancel,
}: {
  line: OrderLine;
  onSet: (status: string) => void;
  onCancel: () => void;
}) {
  const { can } = useLive();
  const cancelled = l.status === "cancelled";
  const canCancel = ["waiting", "cooking", "ready"].includes(l.status) && can("order.cancel");

  return (
    <li className="flex items-center gap-2 py-2 pr-2">
      <Dot light={LINE_LIGHT[l.status]} className="size-2.5 shrink-0" />
      <div className={`min-w-0 flex-1 text-[15px] leading-snug ${cancelled ? "text-stone-400 line-through" : ""}`}>
        <b className="mr-1.5 tabular-nums">{l.qty}×</b>
        {l.name}
        {l.note && <span className="ml-1 text-sm text-amber-700 italic">· {l.note}</span>}
      </div>
      {l.status === "ready" && can("order.serve") && (
        <Btn tone="green" size="sm" className="pulse-ready" onClick={() => onSet("served")} aria-label={`Serve ${l.name}`}>
          <Check className="size-5" />
        </Btn>
      )}
      {l.status === "waiting" && can("kitchen.view") && (
        <Btn tone="amber" size="sm" onClick={() => onSet("cooking")} aria-label={`Start cooking ${l.name}`}>
          <Flame className="size-5" />
        </Btn>
      )}
      {l.status === "cooking" && can("kitchen.view") && (
        <Btn tone="green" size="sm" onClick={() => onSet("ready")} aria-label={`${l.name} ready`}>
          <ChefHat className="size-5" />
        </Btn>
      )}
      {canCancel && (
        <button
          onClick={onCancel}
          className="rounded-full p-1.5 text-stone-300 hover:bg-rose-50 hover:text-rose-700"
          aria-label={`Cancel ${l.name}`}
        >
          <X className="size-4" />
        </button>
      )}
    </li>
  );
}
