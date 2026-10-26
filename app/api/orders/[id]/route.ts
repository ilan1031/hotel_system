import { write } from "@/lib/db";
import { can, handle, HttpError, requireUser } from "@/lib/auth";
import { orderStatus, type OrderStatus, type Permission } from "@/lib/types";

// Allowed moves for a dish and who may make them. Served dishes are final.
const MOVES: Record<string, Permission> = {
  "waiting>ready": "kitchen.view",
  "ready>waiting": "kitchen.view",
  "ready>served": "order.serve",
  "waiting>cancelled": "order.cancel",
  "ready>cancelled": "order.cancel",
};

// Body: { status, lineIds? } — without lineIds, every dish on the ticket that can make the move does.
export const PATCH = handle(async (req: Request, ctx: RouteContext<"/api/orders/[id]">) => {
  const me = await requireUser();
  const { id } = await ctx.params;
  const { status, lineIds } = (await req.json()) as { status: OrderStatus; lineIds?: string[] };
  return write((db) => {
    const o = db.orders.find((x) => x.id === id);
    if (!o) throw new HttpError(404, "Order not found");
    if (db.guests.find((g) => g.id === o.guestId)?.status !== "open") throw new HttpError(400, "Already billed");

    const picked = lineIds ? o.lines.filter((l) => lineIds.includes(l.id)) : o.lines;
    const movable = picked.filter((l) => MOVES[`${l.status}>${status}`]);
    if (!movable.length || (lineIds && movable.length !== picked.length)) {
      throw new HttpError(400, status === "cancelled" ? "Served dishes can't be cancelled" : "Invalid change");
    }
    for (const l of movable) {
      if (!can(me, MOVES[`${l.status}>${status}`])) throw new HttpError(403, "Not allowed");
    }

    const now = Date.now();
    for (const l of movable) {
      l.status = status;
      if (status === "ready") l.readyAt = now;
      if (status === "served") l.servedAt = now;
    }
    o.status = orderStatus(o.lines);
    return o;
  });
});
