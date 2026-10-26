import { read, readMeta } from "@/lib/db";
import { handle, requireUser } from "@/lib/auth";
import type { LiveState } from "@/lib/types";

// Polled by every screen. Returns {v, same:true} when nothing changed.
export const GET = handle(async (req: Request) => {
  await requireUser("floor.view", "kitchen.view", "bill.settle");
  const v = Number(new URL(req.url).searchParams.get("v"));
  if (v === (await readMeta()).version) return { v, same: true }; // cheap check before loading orders
  const db = await read();
  const guests = db.guests.filter((g) => g.status !== "closed");
  const live = new Set(guests.map((g) => g.id));
  const state: LiveState = {
    v: db.version,
    tables: [...db.tables].sort((a, b) => a.order - b.order),
    guests,
    orders: db.orders.filter((o) => live.has(o.guestId)),
    categories: [...db.categories].sort((a, b) => a.order - b.order),
    menu: db.menu,
    users: db.users.map((u) => ({ id: u.id, name: u.name })),
  };
  return state;
});
