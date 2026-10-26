import "server-only";
import { Pool, type PoolClient } from "pg";
import { seed } from "../seed";
import { SCHEMA_SQL } from "./schema.mjs";
import type { DB, Guest, Order } from "../types";
import type { Store } from "./types";

// Postgres store (Neon on Vercel). Writes lock the single pv_meta row, so they run one at a time
// across every serverless instance; reads only load live guests and their orders.

const g = globalThis as unknown as { __pvPool?: Pool; __pvReady?: Promise<void> };

function pool() {
  g.__pvPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.PG_POOL_MAX ?? 3),
    idleTimeoutMillis: 10_000,
  });
  return g.__pvPool;
}

type Meta = Omit<DB, "version" | "guests" | "orders">;

/** Create tables and the seed row on first use (once per server instance). */
function ready() {
  g.__pvReady ??= (async () => {
    await pool().query(SCHEMA_SQL);
    const { rowCount } = await pool().query("SELECT 1 FROM pv_meta WHERE id = 1");
    if (!rowCount) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { version, guests, orders, ...meta } = seed();
      await pool().query("INSERT INTO pv_meta (id, version, data) VALUES (1, 1, $1::jsonb) ON CONFLICT (id) DO NOTHING", [
        JSON.stringify(meta),
      ]);
    }
  })().catch((e) => {
    g.__pvReady = undefined; // retry on the next request
    throw e;
  });
  return g.__pvReady;
}

type Q = Pick<PoolClient, "query">;

async function loadMeta(q: Q, lock = false) {
  const { rows } = await q.query(`SELECT version, data FROM pv_meta WHERE id = 1${lock ? " FOR UPDATE" : ""}`);
  return { version: Number(rows[0].version), meta: rows[0].data as Meta };
}

async function loadLive(q: Q) {
  const guests: Guest[] = (await q.query("SELECT data FROM pv_guests WHERE status <> 'closed'")).rows.map((r) => r.data);
  const orders: Order[] = guests.length
    ? (await q.query("SELECT data FROM pv_orders WHERE guest_id = ANY($1)", [guests.map((x) => x.id)])).rows.map((r) => r.data)
    : [];
  return { guests, orders };
}

export const pgStore: Store = {
  async readMeta() {
    await ready();
    const { version, meta } = await loadMeta(pool());
    return { ...meta, version, guests: [], orders: [] };
  },

  async read() {
    await ready();
    const { version, meta } = await loadMeta(pool());
    return { ...meta, version, ...(await loadLive(pool())) };
  },

  async write(fn) {
    await ready();
    const c = await pool().connect();
    try {
      await c.query("BEGIN");
      const { version, meta } = await loadMeta(c, true);
      const live = await loadLive(c);
      const before = new Map([...live.guests, ...live.orders].map((x) => [x.id, JSON.stringify(x)]));
      const db: DB = { ...meta, version, ...live };

      const result = fn(db);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { version: _v, guests, orders, ...nextMeta } = db;
      await c.query("UPDATE pv_meta SET version = $1, data = $2::jsonb WHERE id = 1", [version + 1, JSON.stringify(nextMeta)]);

      for (const x of guests) {
        const json = JSON.stringify(x);
        if (before.get(x.id) === json) continue;
        await c.query(
          `INSERT INTO pv_guests (id, status, closed_at, data) VALUES ($1, $2, $3, $4::jsonb)
           ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, closed_at = EXCLUDED.closed_at, data = EXCLUDED.data`,
          [x.id, x.status, x.closedAt ?? null, json],
        );
      }
      for (const o of orders) {
        const json = JSON.stringify(o);
        if (before.get(o.id) === json) continue;
        await c.query(
          `INSERT INTO pv_orders (id, guest_id, data) VALUES ($1, $2, $3::jsonb)
           ON CONFLICT (id) DO UPDATE SET guest_id = EXCLUDED.guest_id, data = EXCLUDED.data`,
          [o.id, o.guestId, json],
        );
      }
      // guests removed from the live list (seated by mistake) go with their tickets
      const kept = new Set(guests.map((x) => x.id));
      const dropped = live.guests.map((x) => x.id).filter((id) => !kept.has(id));
      if (dropped.length) {
        await c.query("DELETE FROM pv_orders WHERE guest_id = ANY($1)", [dropped]);
        await c.query("DELETE FROM pv_guests WHERE id = ANY($1)", [dropped]);
      }

      await c.query("COMMIT");
      return result;
    } catch (e) {
      await c.query("ROLLBACK").catch(() => {});
      throw e;
    } finally {
      c.release();
    }
  },

  async readClosed(from, to) {
    await ready();
    const guests: Guest[] = (
      await pool().query("SELECT data FROM pv_guests WHERE status = 'closed' AND closed_at >= $1 AND closed_at < $2", [from, to])
    ).rows.map((r) => r.data);
    const orders: Order[] = guests.length
      ? (await pool().query("SELECT data FROM pv_orders WHERE guest_id = ANY($1)", [guests.map((x) => x.id)])).rows.map((r) => r.data)
      : [];
    return { guests, orders };
  },
};
