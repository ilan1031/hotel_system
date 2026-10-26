// Postgres schema, shared by the app (lib/store/pg.ts) and scripts/db-import.mjs.
//  pv_meta   – one row: tables, menu, roles, users, counters (small, read on every request)
//  pv_guests – one row per customer (dine-in or takeaway); only open/billed ones are "live"
//  pv_orders – one row per kitchen ticket, linked to its guest
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS pv_meta (
  id      int PRIMARY KEY,
  version bigint NOT NULL,
  data    jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS pv_guests (
  id        text PRIMARY KEY,
  status    text NOT NULL,
  closed_at bigint,
  data      jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS pv_guests_live ON pv_guests (status) WHERE status <> 'closed';
CREATE INDEX IF NOT EXISTS pv_guests_closed_at ON pv_guests (closed_at) WHERE status = 'closed';
CREATE TABLE IF NOT EXISTS pv_orders (
  id       text PRIMARY KEY,
  guest_id text NOT NULL,
  data     jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS pv_orders_guest ON pv_orders (guest_id);
`;
