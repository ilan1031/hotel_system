import { uid, write } from "@/lib/db";
import { handle, HttpError, requireUser } from "@/lib/auth";
import { currentDevice } from "@/lib/audit";
import { addGuest, addTakeaway } from "@/lib/guests";
import type { OrderLine } from "@/lib/types";

// Place an order for a guest, a free table (seats guest A first) or a new takeaway ({ takeaway: true }).
export const POST = handle(async (req: Request) => {
  const me = await requireUser("order.take");
  const on = await currentDevice();
  const body = await req.json();
  const lines: { itemId: string; qty: number; note?: string }[] = Array.isArray(body.lines) ? body.lines : [];
  return write((db) => {
    let guest = body.guestId ? db.guests.find((g) => g.id === body.guestId && g.status === "open") : undefined;
    if (!guest && body.tableId) {
      guest =
        db.guests.find((g) => g.tableId === body.tableId && g.status === "open") ??
        addGuest(db, String(body.tableId), me.id, on);
    }
    if (!guest && body.takeaway) guest = addTakeaway(db, me.id, on);
    if (!guest) throw new HttpError(404, "Guest not found or already billed");
    const clean: OrderLine[] = lines.flatMap((l) => {
      const m = db.menu.find((x) => x.id === l.itemId && x.available);
      const qty = Math.min(99, Math.floor(Number(l.qty)));
      const note = typeof l.note === "string" ? l.note.trim().slice(0, 80) : "";
      return m && qty > 0
        ? [{ id: uid("l"), itemId: m.id, name: m.name, price: m.price, qty, status: "waiting" as const, ...(note && { note }) }]
        : [];
    });
    if (!clean.length) throw new HttpError(400, "Pick at least one item");
    const order = {
      id: uid("o"),
      guestId: guest.id,
      tableId: guest.tableId,
      no: ++db.ticketNo,
      lines: clean,
      status: "waiting" as const,
      createdAt: Date.now(),
      createdBy: me.id,
      createdOn: on,
    };
    db.orders.push(order);
    return order;
  });
});
