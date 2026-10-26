import { readClosed, readMeta } from "@/lib/db";
import { handle, requireUser } from "@/lib/auth";
import { dayRange, today } from "@/lib/time";
import { guestPlace } from "@/lib/types";

// Settled bills for a restaurant-local day (default today) — for the cashier.
export const GET = handle(async (req: Request) => {
  await requireUser("bill.settle");
  const day = new URL(req.url).searchParams.get("day");
  const { from, to } = dayRange(day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : today());
  const [{ tables }, closed] = await Promise.all([readMeta(), readClosed(from, to)]);
  const bills = closed.guests
    .filter((g) => !g.left)
    .sort((a, b) => b.closedAt! - a.closedAt!)
    .map((g) => ({
      ...g,
      table: guestPlace(g, tables, false),
      orders: closed.orders
        .filter((o) => o.guestId === g.id && o.status !== "cancelled")
        .map((o) => ({ ...o, lines: o.lines.filter((l) => l.status !== "cancelled") })),
    }));
  return { bills, total: bills.reduce((s, b) => s + (b.total ?? 0), 0) };
});
