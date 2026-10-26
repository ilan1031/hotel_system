import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { readMeta } from "./db";
import type { Me, Permission } from "./types";

const COOKIE = "pv_session";
const MAX_AGE = 60 * 60 * 16; // one long shift

const secret = async () => process.env.AUTH_SECRET || (await readMeta()).secret;
const sign = async (v: string) => createHmac("sha256", await secret()).update(v).digest("base64url");

export async function startSession(req: Request, userId: string) {
  const payload = `${userId}.${Date.now() + MAX_AGE * 1000}`;
  // Secure only over HTTPS, so phones on the restaurant Wi-Fi (http://<lan-ip>:3000) can still sign in.
  const https = new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
  (await cookies()).set(COOKIE, `${payload}.${await sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: https,
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function currentUser(): Promise<Me | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const i = raw.lastIndexOf(".");
  const payload = raw.slice(0, i);
  const a = Buffer.from(raw.slice(i + 1));
  const b = Buffer.from(await sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [userId, exp] = payload.split(".");
  if (Number(exp) < Date.now()) return null;

  const db = await readMeta();
  const user = db.users.find((u) => u.id === userId && u.active);
  const role = user && db.roles.find((r) => r.id === user.roleId);
  if (!user || !role) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...pub } = user;
  return { ...pub, role };
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Throws 401/403 unless the signed-in user holds at least one of `perms`. */
export async function requireUser(...perms: Permission[]) {
  const me = await currentUser();
  if (!me) throw new HttpError(401, "Not signed in");
  if (perms.length && !perms.some((p) => me.role.permissions.includes(p)))
    throw new HttpError(403, "Not allowed");
  return me;
}

export const can = (me: Me, p: Permission) => me.role.permissions.includes(p);

/** Wrap a route handler: JSON errors, no caching. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<unknown>) {
  return async (...args: A) => {
    try {
      const data = await fn(...args);
      return Response.json(data ?? { ok: true }, { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
      if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
      if (e && typeof e === "object" && "digest" in e) throw e; // Next.js control flow (prerender bailout)
      console.error(e);
      return Response.json({ error: "Server error" }, { status: 500 });
    }
  };
}
