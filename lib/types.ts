// Shared types — safe to import from client and server.

export const PERMISSIONS = {
  "floor.view": "See tables",
  "order.take": "Take orders & seat guests",
  "order.serve": "Mark orders served",
  "order.cancel": "Cancel orders",
  "kitchen.view": "Kitchen screen (start cooking, mark ready)",
  "bill.mark": "Mark table for bill",
  "bill.settle": "Settle bills & free table",
  "admin.tables": "Manage tables",
  "admin.menu": "Manage menu",
  "admin.users": "Manage users",
  "admin.roles": "Manage roles & permissions",
} as const;

export type Permission = keyof typeof PERMISSIONS;
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export type Table = { id: string; name: string; seats: number; area: string; order: number };
export type Category = { id: string; name: string; order: number };
export type MenuItem = {
  id: string;
  name: string;
  nameTa?: string;
  categoryId: string;
  price: number;
  veg: boolean;
  available: boolean;
};
export type Role = { id: string; name: string; color: string; permissions: Permission[]; system?: boolean };
export type User = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  roleId: string;
  active: boolean;
  createdAt: number;
};
export type PublicUser = Omit<User, "passwordHash">;

export type SessionStatus = "open" | "bill" | "closed";
export type Guest = {
  id: string;
  kind?: "takeaway"; // unset = dine-in
  tableId: string; // "" for takeaway
  left?: boolean; // customer walked out before billing; nothing charged
  label: string; // A, B, C… (split table)
  status: SessionStatus;
  openedAt: number;
  openedBy: string;
  billedAt?: number;
  billedBy?: string;
  closedAt?: number;
  closedBy?: string;
  total?: number;
};

export type OrderStatus = "waiting" | "cooking" | "ready" | "served" | "cancelled";
// Each dish on a ticket moves on its own: waiting (ordered) → cooking → ready → served,
// or cancelled any time before it is served.
export type OrderLine = {
  id: string;
  itemId: string;
  name: string;
  price: number;
  qty: number;
  note?: string;
  status: OrderStatus;
  cookingAt?: number;
  readyAt?: number;
  /** every status change on this dish: who did it and when (undo steps included) */
  log?: { s: OrderStatus; by: string; at: number }[];
  servedAt?: number;
};
export type Order = {
  id: string;
  guestId: string;
  tableId: string;
  no: number; // running ticket number
  lines: OrderLine[];
  status: OrderStatus; // derived from lines, see orderStatus()
  createdAt: number;
  createdBy: string;
};

export type DB = {
  schema?: number;
  version: number;
  secret: string;
  ticketNo: number;
  parcel?: { day: string; no: number }; // takeaway numbers P1, P2… restart daily
  tables: Table[];
  categories: Category[];
  menu: MenuItem[];
  roles: Role[];
  users: User[];
  guests: Guest[];
  orders: Order[];
};

export type Me = PublicUser & { role: Role };

export type LiveState = {
  v: number;
  tables: Table[];
  guests: Guest[]; // open + bill only
  orders: Order[]; // for live guests
  categories: Category[];
  menu: MenuItem[];
  users: { id: string; name: string }[];
};

// Visual status for a guest at a table (colour only on the floor).
export type Light = "free" | "seated" | "waiting" | "cooking" | "ready" | "served" | "bill";

/** Ticket status from its least-advanced dish: waiting, then cooking, then ready, else served. */
export function orderStatus(lines: OrderLine[]): OrderStatus {
  const live = lines.filter((l) => l.status !== "cancelled");
  if (!live.length) return "cancelled";
  if (live.some((l) => l.status === "waiting")) return "waiting";
  if (live.some((l) => l.status === "cooking")) return "cooking";
  if (live.some((l) => l.status === "ready")) return "ready";
  return "served";
}

export const guestLines = (guestId: string, orders: Order[]) =>
  orders.filter((o) => o.guestId === guestId).flatMap((o) => o.lines.filter((l) => l.status !== "cancelled"));

export function guestLight(g: Guest, orders: Order[]): Light {
  if (g.status === "bill") return "bill";
  const lines = guestLines(g.id, orders);
  if (lines.some((l) => l.status === "ready")) return "ready";
  if (lines.some((l) => l.status === "waiting")) return "waiting";
  if (lines.some((l) => l.status === "cooking")) return "cooking";
  if (lines.length) return "served";
  return "seated";
}

export function guestTotal(guestId: string, orders: Order[]) {
  return guestLines(guestId, orders).reduce((s, l) => s + l.price * l.qty, 0);
}

export const LIGHT_META: Record<Light, { label: string; bg: string; ring: string; dot: string }> = {
  free: { label: "Free", bg: "bg-white", ring: "ring-stone-300", dot: "bg-stone-300" },
  seated: { label: "Seated", bg: "bg-stone-200", ring: "ring-stone-400", dot: "bg-stone-500" },
  waiting: { label: "Ordered", bg: "bg-amber-400", ring: "ring-amber-500", dot: "bg-amber-400" },
  cooking: { label: "Cooking", bg: "bg-orange-600", ring: "ring-orange-700", dot: "bg-orange-600" },
  ready: { label: "Ready", bg: "bg-emerald-500", ring: "ring-emerald-600", dot: "bg-emerald-500" },
  served: { label: "Served", bg: "bg-sky-500", ring: "ring-sky-600", dot: "bg-sky-500" },
  bill: { label: "Bill", bg: "bg-rose-700", ring: "ring-rose-800", dot: "bg-rose-700" },
};

export const isTakeaway = (g?: Pick<Guest, "kind">) => g?.kind === "takeaway";

/** Where a guest is: "T3" / "T3 · B" for dine-in, "P4" for takeaway. */
export function guestPlace(g: Guest, tables: Table[], showLabel = true) {
  if (isTakeaway(g)) return g.label;
  const t = tables.find((x) => x.id === g.tableId)?.name ?? "?";
  return showLabel ? `${t} · ${g.label}` : t;
}

export const rupee = (n: number) => "₹" + n.toLocaleString("en-IN");
