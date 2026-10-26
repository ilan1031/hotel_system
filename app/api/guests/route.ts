import { write } from "@/lib/db";
import { handle, requireUser } from "@/lib/auth";
import { currentDevice } from "@/lib/audit";
import { addGuest } from "@/lib/guests";

// Seat a guest at a table — a second call splits the table (guest B, C…).
export const POST = handle(async (req: Request) => {
  const me = await requireUser("order.take");
  const on = await currentDevice();
  const { tableId } = await req.json();
  return write((db) => addGuest(db, String(tableId), me.id, on));
});
