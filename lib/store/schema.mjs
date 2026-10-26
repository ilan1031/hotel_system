// Postgres schema, shared by the app (lib/store/pg.ts) and scripts/db-import.mjs.
//  pv_meta   – one row: tables, menu, roles, users, counters (small, read on every request)
//  pv_guests – one row per customer (dine-in or takeaway); only open/billed ones are "live"
//  pv_orders – one row per kitchen ticket, linked to its guest
//  pv_logins – one row per sign-in attempt (device, IP, location) for the owner's audit screen
//
// Row level security is switched on with no policies. On Supabase that blocks the public REST API
// (anon / publishable keys) from reading users or password hashes; the app connects as the table
// owner, which RLS does not apply to. On Neon or plain Postgres it changes nothing.
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
CREATE TABLE IF NOT EXISTS pv_logins (
  id   text PRIMARY KEY,
  at   bigint NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS pv_logins_at ON pv_logins (at);
ALTER TABLE pv_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE pv_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pv_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE pv_logins ENABLE ROW LEVEL SECURITY;
`;

/**
 * pg connection options for DATABASE_URL. Hosted databases whose string has no sslmode
 * (Supabase's copied connection string) still get an encrypted connection; Supabase signs it with
 * its own CA, so the certificate isn't verified against Node's built-in list.
 */
export function connectionOptions(url) {
  const u = new URL(url);
  const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(u.hostname);
  if (local || u.searchParams.has("sslmode")) return { connectionString: url };
  return { connectionString: url, ssl: { rejectUnauthorized: false } };
}
