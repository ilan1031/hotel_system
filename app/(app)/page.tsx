"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BellRing, Clock, Loader2, Plus, ShoppingBag, Users } from "lucide-react";
import { useLive } from "@/components/live";
import { TableSheet } from "@/components/table-sheet";
import { MenuPicker, type PickTarget } from "@/components/menu-picker";
import { guestLight, isTakeaway, LIGHT_META, type Guest, type Light, type LiveState, type Table } from "@/lib/types";
import { minsSince, useNow } from "@/lib/client";

const LEGEND: Light[] = ["free", "seated", "waiting", "ready", "served"];

export default function FloorPage() {
  const { state: all, can } = useLive();
  const [area, setArea] = useState("All");
  const [openId, setOpenId] = useState<string | null>(null);
  const [parcelId, setParcelId] = useState<string | null>(null);
  const [newParcel, setNewParcel] = useState<PickTarget | null>(null);
  useNow(30000);

  const areas = useMemo(() => ["All", ...new Set(all?.tables.map((t) => t.area) ?? [])], [all?.tables]);

  if (!all) return <Loader2 className="mx-auto mt-24 size-8 animate-spin text-maroon" />;

  // Billed guests have left the table (they wait on the cashier), so only open guests occupy it.
  const state: LiveState = { ...all, guests: all.guests.filter((g) => g.status === "open") };
  const tables = state.tables.filter((t) => area === "All" || t.area === area);
  const busy = new Set(state.guests.filter((g) => !isTakeaway(g)).map((g) => g.tableId));
  const parcels = state.guests.filter(isTakeaway).sort((a, b) => a.openedAt - b.openedAt);
  const ready = state.orders
    .map((o) => ({ o, lines: o.lines.filter((l) => l.status === "ready") }))
    .filter((r) => r.lines.length)
    .sort((a, b) => Math.min(...a.lines.map((l) => l.readyAt ?? 0)) - Math.min(...b.lines.map((l) => l.readyAt ?? 0)));

  return (
    <>
      <header className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="font-display text-2xl font-extrabold text-maroon sm:text-3xl">பெரிய வீடு</h1>
        <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-stone-600 shadow-sm">
          {state.tables.length - busy.size}/{state.tables.length} free
        </span>
        <div className="no-scrollbar -mx-3 flex w-[calc(100%+1.5rem)] gap-3 overflow-x-auto px-3 sm:mx-0 sm:ml-auto sm:w-auto sm:px-0">
          {LEGEND.map((l) => (
            <span key={l} className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-stone-600">
              <span className={`size-3 rounded-full ring-1 ${LIGHT_META[l].dot} ${LIGHT_META[l].ring}`} />
              {LIGHT_META[l].label}
            </span>
          ))}
        </div>
      </header>

      {areas.length > 2 && (
        <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
          {areas.map((a) => (
            <button
              key={a}
              onClick={() => setArea(a)}
              className={`relative shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                area === a ? "text-white" : "bg-white text-stone-600 shadow-sm"
              }`}
            >
              {area === a && <motion.span layoutId="area-pill" className="absolute inset-0 rounded-full bg-maroon" />}
              <span className="relative">{a}</span>
            </button>
          ))}
        </div>
      )}

      {can("order.serve") && ready.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="no-scrollbar mb-3 flex items-center gap-2 overflow-x-auto rounded-2xl bg-emerald-50 p-2 ring-1 ring-emerald-200"
        >
          <BellRing className="ml-1 size-5 shrink-0 animate-bounce text-emerald-600" />
          {ready.map(({ o, lines }) => {
            const g = state.guests.find((x) => x.id === o.guestId);
            const t = state.tables.find((x) => x.id === o.tableId);
            const parcel = isTakeaway(g);
            return (
              <button
                key={o.id}
                onClick={() => (parcel ? setParcelId(o.guestId) : setOpenId(o.tableId))}
                className="pulse-ready flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white"
              >
                {parcel && <ShoppingBag className="size-4" />}
                {parcel ? g?.label : t?.name}
                {!parcel && tableHasSplit(state, o.tableId) && <span className="opacity-80">·{g?.label}</span>}
                <span className="rounded-md bg-white/20 px-1.5 text-xs">{lines.reduce((s, l) => s + l.qty, 0)}</span>
              </button>
            );
          })}
        </motion.div>
      )}

      {(parcels.length > 0 || can("order.take")) && (
        <section className="no-scrollbar -mx-3 mb-3 flex items-center gap-2 overflow-x-auto px-3 py-1 sm:mx-0 sm:px-0">
          <ShoppingBag className="size-6 shrink-0 text-maroon" aria-label="Takeaway" />
          {can("order.take") && (
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => setNewParcel({ takeaway: true, title: "Parcel" })}
              className="flex h-14 shrink-0 items-center gap-1.5 rounded-2xl bg-maroon px-4 font-bold text-white shadow-md shadow-maroon/25"
            >
              <Plus className="size-5" /> Parcel
            </motion.button>
          )}
          {parcels.map((g) => (
            <ParcelChip key={g.id} guest={g} state={state} onOpen={() => setParcelId(g.id)} />
          ))}
        </section>
      )}

      <motion.div layout className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
        {tables.map((t, i) => (
          <TableTile key={t.id} table={t} state={state} index={i} onOpen={() => setOpenId(t.id)} />
        ))}
      </motion.div>

      <TableSheet tableId={openId} onClose={() => setOpenId(null)} />
      <TableSheet parcelId={parcelId} onClose={() => setParcelId(null)} />
      <MenuPicker target={newParcel} onClose={() => setNewParcel(null)} onPlaced={() => {}} />
    </>
  );
}

const tableHasSplit = (s: LiveState, tableId: string) => s.guests.filter((g) => g.tableId === tableId).length > 1;

function ParcelChip({ guest, state, onOpen }: { guest: Guest; state: LiveState; onOpen: () => void }) {
  const light = guestLight(guest, state.orders);
  const solid = light !== "seated";
  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.94 }}
      onClick={onOpen}
      aria-label={`Parcel ${guest.label} ${LIGHT_META[light].label}`}
      className={`flex h-14 min-w-16 shrink-0 flex-col items-center justify-center rounded-2xl px-3 shadow-sm ${LIGHT_META[light].bg} ${
        light === "ready" ? "pulse-ready" : ""
      }`}
    >
      <span className={`font-display text-xl leading-none font-extrabold ${solid ? "text-white drop-shadow" : "text-ink"}`}>
        {guest.label}
      </span>
      <span className={`mt-0.5 flex items-center gap-0.5 text-[11px] ${solid ? "text-white/85" : "text-stone-500"}`}>
        <Clock className="size-3" />
        {minsSince(guest.openedAt)}m
      </span>
    </motion.button>
  );
}

function TableTile({ table, state, index, onOpen }: { table: Table; state: LiveState; index: number; onOpen: () => void }) {
  const guests = state.guests.filter((g) => g.tableId === table.id).sort((a, b) => a.label.localeCompare(b.label));
  const lights = guests.map((g) => guestLight(g, state.orders));
  const waiting = state.orders.filter((o) => o.tableId === table.id && o.status === "waiting");
  const oldest = waiting.length ? Math.min(...waiting.map((o) => o.createdAt)) : 0;
  const mins = oldest ? minsSince(oldest) : 0;
  const free = guests.length === 0;
  const hasReady = lights.includes("ready");

  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(index * 0.02, 0.3) }}
      whileTap={{ scale: 0.94 }}
      whileHover={{ y: -2 }}
      onClick={onOpen}
      aria-label={`${table.name} ${free ? "free" : lights.map((l) => LIGHT_META[l].label).join(", ")}`}
      className={`relative aspect-square overflow-hidden rounded-3xl text-left shadow-sm ${
        free ? "border-2 border-dashed border-stone-300 bg-white/80" : "shadow-md"
      } ${hasReady ? "pulse-ready" : ""}`}
    >
      {!free && (
        <div className="absolute inset-0 flex">
          {lights.map((l, i) => (
            <motion.div
              key={guests[i].id}
              layout
              className={`relative flex-1 ${LIGHT_META[l].bg} ${i ? "border-l-2 border-white/70" : ""}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {lights.length > 1 && (
                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-xs font-bold text-white/90">
                  {guests[i].label}
                </span>
              )}
            </motion.div>
          ))}
        </div>
      )}
      <div className="relative flex h-full flex-col items-center justify-center">
        <span
          className={`font-display text-2xl font-extrabold sm:text-3xl ${
            free ? "text-stone-700" : lights.every((l) => l === "seated") ? "text-ink" : "text-white drop-shadow"
          }`}
        >
          {table.name}
        </span>
        <span className={`mt-0.5 flex items-center gap-1 text-xs ${free ? "text-stone-400" : "text-white/80"}`}>
          <Users className="size-3" />
          {table.seats}
        </span>
      </div>
      {mins > 0 && (
        <span
          className={`absolute top-1.5 right-1.5 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
            mins >= 15 ? "bg-rose-700 text-white" : "bg-white/90 text-amber-700"
          }`}
        >
          <Clock className="size-3" />
          {mins}
        </span>
      )}
    </motion.button>
  );
}
