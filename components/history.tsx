"use client";

import { useState } from "react";
import { Info, Smartphone } from "lucide-react";
import { useLive } from "./live";
import { Modal } from "./ui";
import type { Guest, Order, OrderStatus } from "@/lib/types";

const RANK: Record<OrderStatus, number> = { waiting: 0, cooking: 1, ready: 2, served: 3, cancelled: 4 };
const LABEL: Record<OrderStatus, string> = {
  waiting: "Ordered",
  cooking: "Started cooking",
  ready: "Ready",
  served: "Served",
  cancelled: "Cancelled",
};
const DOT: Record<OrderStatus, string> = {
  waiting: "bg-amber-400",
  cooking: "bg-orange-600",
  ready: "bg-emerald-500",
  served: "bg-sky-500",
  cancelled: "bg-stone-400",
};

const time = (t?: number) => (t ? new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "");

function useNames() {
  const users = useLive().state?.users ?? [];
  return (id?: string) => users.find((u) => u.id === id)?.name ?? "—";
}

/** Small round ⓘ in a card's top-right corner. */
function InfoButton({ onClick, light }: { onClick: () => void; light?: boolean }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label="History"
      className={`rounded-full p-1.5 ${light ? "text-white/80 hover:bg-white/20" : "text-stone-400 hover:bg-stone-100 hover:text-stone-600"}`}
    >
      <Info className="size-4" />
    </button>
  );
}

/** Device an action was done on. The server only sends it to the owner and Admin role. */
function Device({ name }: { name?: string }) {
  if (!name) return null;
  return (
    <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-stone-100 px-1 text-[11px] text-stone-500">
      <Smartphone className="size-3" />
      {name}
    </span>
  );
}

function Step({ status, who, at, back, on }: { status: OrderStatus; who: string; at?: number; back?: boolean; on?: string }) {
  return (
    <li className="flex items-center gap-2 py-0.5 text-sm">
      <span className={`size-2 shrink-0 rounded-full ${DOT[status]}`} />
      <span className="min-w-0 flex-1">
        {back ? `↶ Back to ${LABEL[status].toLowerCase()}` : LABEL[status]} · <b>{who}</b>
        <Device name={on} />
      </span>
      <span className="text-stone-400 tabular-nums">{time(at)}</span>
    </li>
  );
}

function OrderSteps({ order: o }: { order: Order }) {
  const name = useNames();
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-stone-200">
      <p className="mb-2 text-sm text-stone-500">
        #{o.no} · ordered by <b className="text-ink">{name(o.createdBy)}</b> · {time(o.createdAt)}
        <Device name={o.createdOn} />
      </p>
      <ul className="space-y-2">
        {o.lines.map((l) => {
          let prev: OrderStatus = "waiting";
          return (
            <li key={l.id}>
              <p className="font-semibold">
                {l.qty}× {l.name}
              </p>
              <ul className="ml-1 border-l-2 border-stone-100 pl-3">
                {(l.log ?? []).map((e, i) => {
                  const back = RANK[e.s] < RANK[prev];
                  prev = e.s;
                  return <Step key={i} status={e.s} who={name(e.by)} at={e.at} back={back} on={e.d} />;
                })}
                {!l.log?.length && <li className="text-sm text-stone-400">Not started yet</li>}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** ⓘ for one kitchen ticket: who ordered it and who moved each dish, with times. */
export function OrderHistory({ order, light }: { order: Order; light?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <InfoButton light={light} onClick={() => setOpen(true)} />
      <Modal open={open} onClose={() => setOpen(false)} title={`Ticket #${order.no}`}>
        <OrderSteps order={order} />
      </Modal>
    </>
  );
}

/** ⓘ for a whole customer: seated, every ticket, billed and paid. */
export function GuestHistory({ guest: g, orders, title }: { guest: Guest; orders: Order[]; title: string }) {
  const [open, setOpen] = useState(false);
  const name = useNames();
  return (
    <>
      <InfoButton onClick={() => setOpen(true)} />
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        <ul className="mb-3 space-y-1 text-sm">
          <li>
            Opened by <b>{name(g.openedBy)}</b> · {time(g.openedAt)}
            <Device name={g.openedOn} />
          </li>
          {g.billedAt && (
            <li>
              Billed by <b>{name(g.billedBy)}</b> · {time(g.billedAt)}
              <Device name={g.billedOn} />
            </li>
          )}
          {g.closedAt && (
            <li>
              {g.left ? "Removed" : "Paid"} by <b>{name(g.closedBy)}</b> · {time(g.closedAt)}
              <Device name={g.closedOn} />
            </li>
          )}
        </ul>
        <div className="space-y-2">
          {[...orders]
            .sort((a, b) => a.createdAt - b.createdAt)
            .map((o) => (
              <OrderSteps key={o.id} order={o} />
            ))}
        </div>
      </Modal>
    </>
  );
}
