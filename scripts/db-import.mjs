// Copy the local data/db.json (tables, menu, users, roles, orders, bills) into Postgres.
//
//   DATABASE_URL="postgres://…" npm run db:import            # only into an empty database
//   DATABASE_URL="postgres://…" npm run db:import -- --force # replace what's in the database
//
// Optional: pass a different file as the first argument.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { connectionOptions, SCHEMA_SQL } from "../lib/store/schema.mjs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL to your database connection string first (see .env.example).");
  process.exit(1);
}
const force = process.argv.includes("--force");
const file = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? path.join(process.cwd(), "data", "db.json");
const db = JSON.parse(fs.readFileSync(file, "utf8"));
if ((db.schema ?? 1) < 2) {
  console.error("This file is from an old version. Start the app once locally (npm run dev) to upgrade it, then retry.");
  process.exit(1);
}

const client = new pg.Client(connectionOptions(url));
await client.connect();
try {
  await client.query(SCHEMA_SQL);
  const { rowCount } = await client.query("SELECT 1 FROM pv_meta WHERE id = 1");
  if (rowCount && !force) {
    console.error("The database already has data. Re-run with --force to replace it.");
    process.exit(1);
  }

  const { version, guests, orders, logins = [], ...meta } = db;
  await client.query("BEGIN");
  await client.query("TRUNCATE pv_meta, pv_guests, pv_orders, pv_logins");
  await client.query("INSERT INTO pv_meta (id, version, data) VALUES (1, $1, $2::jsonb)", [version ?? 1, JSON.stringify(meta)]);
  for (const g of guests) {
    await client.query("INSERT INTO pv_guests (id, status, closed_at, data) VALUES ($1, $2, $3, $4::jsonb)", [
      g.id,
      g.status,
      g.closedAt ?? null,
      JSON.stringify(g),
    ]);
  }
  for (const o of orders) {
    await client.query("INSERT INTO pv_orders (id, guest_id, data) VALUES ($1, $2, $3::jsonb)", [o.id, o.guestId, JSON.stringify(o)]);
  }
  for (const e of logins) {
    await client.query("INSERT INTO pv_logins (id, at, data) VALUES ($1, $2, $3::jsonb)", [e.id, e.at, JSON.stringify(e)]);
  }
  await client.query("COMMIT");
  console.log(
    `Imported ${meta.tables.length} tables, ${meta.menu.length} menu items, ${meta.users.length} users, ` +
      `${guests.length} guests and ${orders.length} orders.`,
  );
} catch (e) {
  await client.query("ROLLBACK").catch(() => {});
  console.error(e);
  process.exitCode = 1;
} finally {
  await client.end();
}
