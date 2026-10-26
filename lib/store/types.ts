import type { DB, Guest, LoginEvent, Order } from "../types";

export interface Store {
  /** Settings only (tables, menu, roles, users, counters); guests/orders are empty. */
  readMeta(): Promise<DB>;
  /** Settings plus live guests (open or billed) and their orders. */
  read(): Promise<DB>;
  /** Run a mutation atomically on `read()` data; bumps `version` so every screen refreshes. */
  write<T>(fn: (db: DB) => T): Promise<T>;
  /** Settled guests closed within [from, to) and their orders. */
  readClosed(from: number, to: number): Promise<{ guests: Guest[]; orders: Order[] }>;
  /** Login audit: append one attempt (no version bump — screens don't need to refresh). */
  addLogin(e: LoginEvent): Promise<void>;
  /** Login attempts within [from, to), newest first. */
  readLogins(from: number, to: number): Promise<LoginEvent[]>;
}
