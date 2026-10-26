import "server-only";
import { uid } from "./db";
import { today } from "./time";
import { HttpError } from "./auth";
import type { DB } from "./types";

export function freeLabel(db: DB, tableId: string) {
  const used = new Set(db.guests.filter((g) => g.tableId === tableId && g.status === "open").map((g) => g.label));
  return "ABCDEFGH".split("").find((l) => !used.has(l));
}

/** A takeaway (parcel) customer, numbered P1, P2… per day. */
export function addTakeaway(db: DB, by: string) {
  const day = today();
  if (db.parcel?.day !== day) db.parcel = { day, no: 0 };
  const guest = {
    id: uid("g"),
    kind: "takeaway" as const,
    tableId: "",
    label: `P${++db.parcel.no}`,
    status: "open" as const,
    openedAt: Date.now(),
    openedBy: by,
  };
  db.guests.push(guest);
  return guest;
}

export function addGuest(db: DB, tableId: string, by: string) {
  if (!db.tables.some((t) => t.id === tableId)) throw new HttpError(404, "No such table");
  const label = freeLabel(db, tableId);
  if (!label) throw new HttpError(400, "Table is full");
  const guest = { id: uid("g"), tableId, label, status: "open" as const, openedAt: Date.now(), openedBy: by };
  db.guests.push(guest);
  return guest;
}
