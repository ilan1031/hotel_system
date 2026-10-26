import { write } from "@/lib/db";
import { can, handle, HttpError, requireUser } from "@/lib/auth";
import { freeLabel } from "@/lib/guests";
import { guestLines, guestTotal, isTakeaway, orderStatus, type Permission } from "@/lib/types";

export const PATCH = handle(async (req: Request, ctx: RouteContext<"/api/guests/[id]">) => {
  const me = await requireUser();
  const { id } = await ctx.params;
  const { action, tableId } = await req.json();
  const need = (p: Permission) => {
    if (!can(me, p)) throw new HttpError(403, "Not allowed");
  };
  return write((db) => {
    const g = db.guests.find((x) => x.id === id && x.status !== "closed");
    if (!g) throw new HttpError(404, "Guest not found");
    const lines = guestLines(id, db.orders);
    switch (action) {
      // Billing hands the guest over to the cashier and frees the table for the next diners.
      case "bill":
        need("bill.mark");
        if (g.status !== "open") throw new HttpError(400, "Already billed");
        if (!lines.length) throw new HttpError(400, "No orders yet");
        if (lines.some((l) => l.status !== "served")) throw new HttpError(400, "Serve or cancel all dishes first");
        g.status = "bill";
        g.billedAt = Date.now();
        g.billedBy = me.id;
        g.total = guestTotal(id, db.orders);
        break;
      // Payment happens only from a bill.
      case "settle":
        need("bill.settle");
        if (g.status !== "bill") throw new HttpError(400, "Mark the bill first");
        g.status = "closed";
        g.closedAt = Date.now();
        g.closedBy = me.id;
        break;
      case "move": {
        need("order.take");
        if (g.status !== "open") throw new HttpError(400, "Already billed");
        if (isTakeaway(g)) throw new HttpError(400, "Takeaway has no table");
        if (!db.tables.some((t) => t.id === tableId)) throw new HttpError(404, "No such table");
        const label = freeLabel(db, tableId);
        if (!label) throw new HttpError(400, "Table is full");
        g.tableId = tableId;
        g.label = label;
        db.orders.filter((o) => o.guestId === id).forEach((o) => (o.tableId = tableId));
        break;
      }
      default:
        throw new HttpError(400, "Unknown action");
    }
    return g;
  });
});

// Customer left before eating (changed their mind): cancel unserved dishes and free the seat.
// Served dishes must be billed instead.
export const DELETE = handle(async (_req: Request, ctx: RouteContext<"/api/guests/[id]">) => {
  const me = await requireUser("order.take");
  const { id } = await ctx.params;
  await write((db) => {
    const g = db.guests.find((x) => x.id === id);
    if (!g || g.status !== "open") throw new HttpError(400, "Already billed");
    const lines = guestLines(id, db.orders);
    if (lines.some((l) => l.status === "served")) throw new HttpError(400, "Served dishes must be billed");
    if (lines.length && !can(me, "order.cancel")) throw new HttpError(403, "Not allowed");
    if (!lines.length) {
      db.guests = db.guests.filter((x) => x.id !== id); // nothing ordered: no trace needed
      return;
    }
    for (const o of db.orders.filter((x) => x.guestId === id)) {
      o.lines.forEach((l) => (l.status = "cancelled"));
      o.status = orderStatus(o.lines);
    }
    Object.assign(g, { status: "closed", left: true, total: 0, closedAt: Date.now(), closedBy: me.id });
  });
});
