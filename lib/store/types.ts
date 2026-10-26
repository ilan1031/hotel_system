import type { DB, Guest, Order } from "../types";

export interface Store {
  /** Settings only (tables, menu, roles, users, counters); guests/orders are empty. */
  readMeta(): Promise<DB>;
  /** Settings plus live guests (open or billed) and their orders. */
  read(): Promise<DB>;
  /** Run a mutation atomically on `read()` data; bumps `version` so every screen refreshes. */
  write<T>(fn: (db: DB) => T): Promise<T>;
  /** Settled guests closed within [from, to) and their orders. */
  readClosed(from: number, to: number): Promise<{ guests: Guest[]; orders: Order[] }>;
}
