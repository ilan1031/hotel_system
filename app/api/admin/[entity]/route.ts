import { readMeta, uid, write } from "@/lib/db";
import { handle, HttpError, requireUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { isOwner } from "@/lib/owner";
import { ALL_PERMISSIONS, type DB, type Me, type Permission } from "@/lib/types";

type Ctx = RouteContext<"/api/admin/[entity]">;
type Body = Record<string, unknown>;

const str = (v: unknown, max = 80) => String(v ?? "").trim().slice(0, max);
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// entity -> who can read / write, and how to list, save and delete.
const ENTITIES: Record<
  string,
  {
    read: Permission[];
    write: Permission;
    list: (db: DB, me: Me) => unknown[];
    save: (db: DB, b: Body, me: Me) => unknown;
    remove: (db: DB, id: string, me: Me) => void;
  }
> = {
  tables: {
    read: ["admin.tables"],
    write: "admin.tables",
    list: (db) => [...db.tables].sort((a, b) => a.order - b.order),
    save(db, b) {
      const name = str(b.name, 20);
      if (!name) throw new HttpError(400, "Name required");
      const t = db.tables.find((x) => x.id === b.id);
      const data = { name, seats: Math.max(1, num(b.seats) || 4), area: str(b.area, 30) || "Hall" };
      if (t) return Object.assign(t, data, b.order !== undefined && { order: num(b.order) });
      const created = { id: uid("t"), order: db.tables.length, ...data };
      db.tables.push(created);
      return created;
    },
    remove(db, id) {
      if (db.guests.some((g) => g.tableId === id && g.status !== "closed"))
        throw new HttpError(400, "Table is in use");
      db.tables = db.tables.filter((t) => t.id !== id);
    },
  },
  categories: {
    read: ["admin.menu"],
    write: "admin.menu",
    list: (db) => [...db.categories].sort((a, b) => a.order - b.order),
    save(db, b) {
      const name = str(b.name, 40);
      if (!name) throw new HttpError(400, "Name required");
      const c = db.categories.find((x) => x.id === b.id);
      if (c) return Object.assign(c, { name }, b.order !== undefined && { order: num(b.order) });
      const created = { id: uid("c"), name, order: db.categories.length };
      db.categories.push(created);
      return created;
    },
    remove(db, id) {
      if (db.menu.some((m) => m.categoryId === id)) throw new HttpError(400, "Category has items");
      db.categories = db.categories.filter((c) => c.id !== id);
    },
  },
  menu: {
    read: ["admin.menu"],
    write: "admin.menu",
    list: (db) => db.menu,
    save(db, b) {
      const m = db.menu.find((x) => x.id === b.id);
      const data = {
        name: str(b.name ?? m?.name, 60),
        nameTa: str(b.nameTa ?? m?.nameTa, 60) || undefined,
        categoryId: str(b.categoryId ?? m?.categoryId),
        price: Math.max(0, num(b.price ?? m?.price)),
        veg: Boolean(b.veg ?? m?.veg),
        available: b.available === undefined ? (m?.available ?? true) : Boolean(b.available),
      };
      if (!data.name) throw new HttpError(400, "Name required");
      if (!db.categories.some((c) => c.id === data.categoryId)) throw new HttpError(400, "Pick a category");
      if (m) return Object.assign(m, data);
      const created = { id: uid("m"), ...data };
      db.menu.push(created);
      return created;
    },
    remove(db, id) {
      db.menu = db.menu.filter((m) => m.id !== id);
    },
  },
  users: {
    read: ["admin.users"],
    write: "admin.users",
    // the owner account is invisible to everyone but the owner
    list: (db, me) =>
      db.users
        .filter((u) => isOwner(me) || !isOwner(u))
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .map(({ passwordHash, ...u }) => u),
    save(db, b, me) {
      const target = db.users.find((x) => x.id === b.id);
      if (target && isOwner(target) && !isOwner(me)) throw new HttpError(404, "User not found");
      const email = str(b.email, 120).toLowerCase();
      const name = str(b.name, 60);
      const roleId = str(b.roleId);
      const password = String(b.password ?? "");
      if (!name || !/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, "Name and valid email required");
      if (!db.roles.some((r) => r.id === roleId)) throw new HttpError(400, "Pick a role");
      if (db.users.some((u) => u.email === email && u.id !== b.id)) throw new HttpError(400, "Email already used");
      if (password && password.length < 6) throw new HttpError(400, "Password min 6 characters");
      const u = db.users.find((x) => x.id === b.id);
      const active = b.active === undefined ? true : Boolean(b.active);
      if (u) {
        if (u.id === me.id && (!active || roleId !== u.roleId)) throw new HttpError(400, "You can't demote yourself");
        Object.assign(u, { name, email, roleId, active }, password && { passwordHash: hashPassword(password) });
        return { ...u, passwordHash: undefined };
      }
      if (!password) throw new HttpError(400, "Password required");
      const created = { id: uid("u"), name, email, roleId, active, passwordHash: hashPassword(password), createdAt: Date.now() };
      db.users.push(created);
      return { ...created, passwordHash: undefined };
    },
    remove(db, id, me) {
      if (id === me.id) throw new HttpError(400, "You can't delete yourself");
      const target = db.users.find((x) => x.id === id);
      if (target && isOwner(target) && !isOwner(me)) throw new HttpError(404, "User not found");
      db.users = db.users.filter((u) => u.id !== id);
    },
  },
  roles: {
    read: ["admin.roles", "admin.users"],
    write: "admin.roles",
    list: (db) => db.roles,
    save(db, b) {
      const name = str(b.name, 30);
      if (!name) throw new HttpError(400, "Name required");
      const perms = (Array.isArray(b.permissions) ? b.permissions : []).filter((p): p is Permission =>
        ALL_PERMISSIONS.includes(p as Permission),
      );
      const color = /^#[0-9a-f]{6}$/i.test(String(b.color)) ? String(b.color) : "#57534e";
      const r = db.roles.find((x) => x.id === b.id);
      if (r) {
        // The built-in Admin role always keeps every permission, so nobody gets locked out.
        return Object.assign(r, { name, color, permissions: r.system ? [...ALL_PERMISSIONS] : perms });
      }
      const created = { id: uid("r"), name, color, permissions: perms };
      db.roles.push(created);
      return created;
    },
    remove(db, id) {
      const r = db.roles.find((x) => x.id === id);
      if (r?.system) throw new HttpError(400, "Built-in role");
      if (db.users.some((u) => u.roleId === id)) throw new HttpError(400, "Role is assigned to users");
      db.roles = db.roles.filter((x) => x.id !== id);
    },
  },
};

function entity(name: string) {
  const e = ENTITIES[name];
  if (!e) throw new HttpError(404, "Unknown");
  return e;
}

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const e = entity((await ctx.params).entity);
  const me = await requireUser(...e.read);
  return e.list(await readMeta(), me);
});

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const e = entity((await ctx.params).entity);
  const me = await requireUser(e.write);
  const body = (await req.json()) as Body;
  return write((db) => e.save(db, body, me));
});

export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const e = entity((await ctx.params).entity);
  const me = await requireUser(e.write);
  const id = new URL(req.url).searchParams.get("id") ?? "";
  await write((db) => e.remove(db, id, me));
});
