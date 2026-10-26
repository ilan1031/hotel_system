import "server-only";
import fs from "node:fs";
import path from "node:path";
import { seed } from "../seed";
import { orderStatus, type DB } from "../types";
import type { Store } from "./types";

// Single-file JSON store for local use (no DATABASE_URL), cached in memory and written atomically.
// Only safe for one long-running server process with a real disk — not for Vercel.

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "db.json");

const g = globalThis as unknown as { __pvdb?: DB };

function load(): DB {
  if (g.__pvdb) return g.__pvdb;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  g.__pvdb = fs.existsSync(FILE) ? migrate(JSON.parse(fs.readFileSync(FILE, "utf8")) as DB) : seed();
  persist(g.__pvdb);
  return g.__pvdb;
}

/** Upgrade files written by older versions of the app. */
export function migrate(db: DB) {
  if ((db.schema ?? 1) < 2) {
    // v2: status moved from the ticket onto each dish; waiters may cancel unserved dishes
    for (const o of db.orders) {
      o.lines = o.lines.map((l, i) => ({ ...l, id: l.id ?? `${o.id}-${i}`, status: l.status ?? o.status }));
      o.status = orderStatus(o.lines);
    }
    const waiter = db.roles.find((r) => r.id === "waiter");
    if (waiter && !waiter.permissions.includes("order.cancel")) waiter.permissions.push("order.cancel");
    db.schema = 2;
  }
  return db;
}

function persist(db: DB) {
  const tmp = FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 1));
  fs.renameSync(tmp, FILE);
}

export const fileStore: Store = {
  async readMeta() {
    return load();
  },
  async read() {
    return load();
  },
  async write(fn) {
    // mutate a copy so a failed change (HttpError halfway through) leaves nothing behind
    const next = structuredClone(load());
    const result = fn(next);
    next.version++;
    persist(next);
    g.__pvdb = next;
    return result;
  },
  async readClosed(from, to) {
    const db = load();
    const guests = db.guests.filter((x) => x.status === "closed" && x.closedAt! >= from && x.closedAt! < to);
    const ids = new Set(guests.map((x) => x.id));
    return { guests, orders: db.orders.filter((o) => ids.has(o.guestId)) };
  },
  async addLogin(e) {
    const db = load();
    db.logins = [...(db.logins ?? []), e].slice(-5000); // keep the file small
    persist(db);
  },
  async readLogins(from, to) {
    return (load().logins ?? []).filter((e) => e.at >= from && e.at < to).sort((a, b) => b.at - a.at);
  },
};
