import "server-only";
import { randomUUID } from "node:crypto";
import { fileStore } from "./store/file";
import { pgStore } from "./store/pg";
import type { Store } from "./store/types";

// DATABASE_URL set → Postgres (Supabase or Neon on Vercel). Otherwise a local JSON file in ./data.
function pick(): Store {
  if (process.env.DATABASE_URL) return pgStore;
  if (process.env.VERCEL) throw new Error("DATABASE_URL is not set. Add your database connection string in Vercel → Settings → Environment Variables.");
  return fileStore;
}

export const readMeta: Store["readMeta"] = () => pick().readMeta();
export const read: Store["read"] = () => pick().read();
export const write: Store["write"] = (fn) => pick().write(fn);
export const readClosed: Store["readClosed"] = (from, to) => pick().readClosed(from, to);

export const uid = (p = "") => p + randomUUID().slice(0, 8);
