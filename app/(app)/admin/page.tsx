"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutGrid, Lock, Plus, Search, Shield, Trash2, Users, UtensilsCrossed } from "lucide-react";
import { useLive } from "@/components/live";
import { useConfirm } from "@/components/confirm";
import { Btn, Field, inputCls, Modal } from "@/components/ui";
import { api } from "@/lib/client";
import {
  ALL_PERMISSIONS,
  PERMISSIONS,
  rupee,
  type Category,
  type MenuItem,
  type Permission,
  type PublicUser,
  type Role,
  type Table,
} from "@/lib/types";

const TABS = [
  { id: "tables", label: "Tables", icon: LayoutGrid, perm: "admin.tables" },
  { id: "menu", label: "Menu", icon: UtensilsCrossed, perm: "admin.menu" },
  { id: "users", label: "Users", icon: Users, perm: "admin.users" },
  { id: "roles", label: "Roles", icon: Shield, perm: "admin.roles" },
] as const;

export default function AdminPage() {
  const { can } = useLive();
  const tabs = TABS.filter((t) => can(t.perm));
  const [picked, setTab] = useState<string>();
  const tab = tabs.some((t) => t.id === picked) ? picked : tabs[0]?.id;

  return (
    <>
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 font-semibold ${
              tab === t.id ? "text-white" : "bg-white text-stone-600 shadow-sm"
            }`}
          >
            {tab === t.id && <motion.span layoutId="admin-tab" className="absolute inset-0 rounded-2xl bg-maroon" />}
            <t.icon className="relative size-5" />
            <span className="relative">{t.label}</span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
          {tab === "tables" && <TablesAdmin />}
          {tab === "menu" && <MenuAdmin />}
          {tab === "users" && <UsersAdmin />}
          {tab === "roles" && <RolesAdmin />}
        </motion.div>
      </AnimatePresence>
    </>
  );
}

/** Load / save / delete one admin entity. */
function useEntity<T extends { id: string }>(entity: string) {
  const { toast, refresh } = useLive();
  const confirm = useConfirm();
  const [rows, setRows] = useState<T[] | null>(null);
  const load = useCallback(() => api<T[]>(`/api/admin/${entity}`).then(setRows).catch((e) => toast(e.message, false)), [entity, toast]);
  useEffect(() => {
    load();
  }, [load]);
  const save = async (body: Partial<T> & Record<string, unknown>) => {
    try {
      await api(`/api/admin/${entity}`, "POST", body);
      toast("Saved");
      await Promise.all([load(), refresh()]);
      return true;
    } catch (e) {
      toast((e as Error).message, false);
      return false;
    }
  };
  const remove = async (id: string) => {
    if (!(await confirm({ title: "Delete?", detail: "This can't be undone.", yes: "Delete" }))) return false;
    try {
      await api(`/api/admin/${entity}?id=${id}`, "DELETE");
      toast("Deleted");
      await Promise.all([load(), refresh()]);
      return true;
    } catch (e) {
      toast((e as Error).message, false);
      return false;
    }
  };
  return { rows, save, remove };
}

function AddTile({ onClick, className = "" }: { onClick: () => void; className?: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex items-center justify-center rounded-2xl border-2 border-dashed border-stone-300 text-stone-400 hover:border-maroon hover:text-maroon ${className}`}
      aria-label="Add"
    >
      <Plus className="size-8" />
    </motion.button>
  );
}

/* ───────────── Tables ───────────── */

function TablesAdmin() {
  const { rows, save, remove } = useEntity<Table>("tables");
  const [edit, setEdit] = useState<Partial<Table> | null>(null);

  const next = () => {
    const nums = (rows ?? []).map((t) => Number(t.name.replace(/\D/g, ""))).filter(Boolean);
    return { name: `T${(nums.length ? Math.max(...nums) : 0) + 1}`, seats: 4, area: rows?.at(-1)?.area ?? "Hall" };
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-8">
        {rows?.map((t, i) => (
          <motion.button
            key={t.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.02 }}
            onClick={() => setEdit(t)}
            className="flex aspect-square flex-col items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-stone-200"
          >
            <span className="font-display text-2xl font-bold">{t.name}</span>
            <span className="flex items-center gap-1 text-xs text-stone-500">
              <Users className="size-3" />
              {t.seats} · {t.area}
            </span>
          </motion.button>
        ))}
        <AddTile className="aspect-square" onClick={() => setEdit(next())} />
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit table" : "New table"}>
        {edit && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (await save(edit)) setEdit(null);
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name">
                <input className={inputCls} value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required />
              </Field>
              <Field label="Seats">
                <input type="number" min={1} className={inputCls} value={edit.seats ?? 4} onChange={(e) => setEdit({ ...edit, seats: +e.target.value })} />
              </Field>
            </div>
            <Field label="Area">
              <input className={inputCls} list="areas" value={edit.area ?? ""} onChange={(e) => setEdit({ ...edit, area: e.target.value })} />
              <datalist id="areas">
                {[...new Set(rows?.map((t) => t.area))].map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </Field>
            <div className="flex gap-2">
              {edit.id && (
                <Btn type="button" tone="ghost" onClick={async () => (await remove(edit.id!)) && setEdit(null)}>
                  <Trash2 className="size-5 text-rose-700" />
                </Btn>
              )}
              <Btn className="flex-1">Save</Btn>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

/* ───────────── Menu ───────────── */

function MenuAdmin() {
  const cats = useEntity<Category>("categories");
  const items = useEntity<MenuItem>("menu");
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Partial<MenuItem> | null>(null);
  const [editCat, setEditCat] = useState<Partial<Category> | null>(null);

  const list = (items.rows ?? []).filter(
    (m) => (cat === "all" || m.categoryId === cat) && (!q || m.name.toLowerCase().includes(q.toLowerCase())),
  );
  const catName = (id: string) => cats.rows?.find((c) => c.id === id)?.name ?? "";

  return (
    <>
      <div className="no-scrollbar mb-3 flex items-center gap-2 overflow-x-auto pb-1">
        {[{ id: "all", name: "All" } as Category, ...(cats.rows ?? [])].map((c) => (
          <button
            key={c.id}
            onClick={() => (cat === c.id && c.id !== "all" ? setEditCat(c) : setCat(c.id))}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold ${
              cat === c.id ? "bg-ink text-white" : "bg-white text-stone-600 ring-1 ring-stone-200"
            }`}
            title={cat === c.id ? "Tap again to edit" : undefined}
          >
            {c.name}
          </button>
        ))}
        <button onClick={() => setEditCat({ name: "" })} className="shrink-0 rounded-full p-2 text-stone-500 ring-1 ring-dashed ring-stone-300" aria-label="Add category">
          <Plus className="size-4" />
        </button>
      </div>
      <div className="mb-3 flex gap-2">
        <label className="flex h-11 flex-1 items-center gap-2 rounded-xl bg-white px-3 ring-1 ring-stone-200">
          <Search className="size-4 text-stone-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="w-full bg-transparent outline-none" />
        </label>
        <Btn onClick={() => setEdit({ categoryId: cat !== "all" ? cat : cats.rows?.[0]?.id, veg: false, available: true, price: 0 })}>
          <Plus className="size-5" />
        </Btn>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((m) => (
          <motion.div
            layout
            key={m.id}
            className={`flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200 ${m.available ? "" : "opacity-55"}`}
          >
            <button onClick={() => setEdit(m)} className="min-w-0 flex-1 text-left">
              <p className="flex items-center gap-2 truncate font-semibold">
                <span className={`size-2.5 shrink-0 rounded-full ${m.veg ? "bg-emerald-600" : "bg-rose-700"}`} />
                {m.name}
              </p>
              <p className="truncate text-xs text-stone-500">
                {m.nameTa} · {catName(m.categoryId)}
              </p>
            </button>
            <span className="font-bold text-maroon">{rupee(m.price)}</span>
            <Switch on={m.available} onChange={(v) => items.save({ id: m.id, available: v })} />
          </motion.div>
        ))}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit item" : "New item"}>
        {edit && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (await items.save(edit)) setEdit(null);
            }}
          >
            <Field label="Name">
              <input className={inputCls} value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required />
            </Field>
            <Field label="Tamil name">
              <input className={inputCls} value={edit.nameTa ?? ""} onChange={(e) => setEdit({ ...edit, nameTa: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price ₹">
                <input type="number" min={0} className={inputCls} value={edit.price ?? 0} onChange={(e) => setEdit({ ...edit, price: +e.target.value })} />
              </Field>
              <Field label="Category">
                <select className={inputCls} value={edit.categoryId ?? ""} onChange={(e) => setEdit({ ...edit, categoryId: e.target.value })}>
                  {cats.rows?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="mb-4 flex gap-6">
              <label className="flex items-center gap-2 font-medium">
                <Switch on={!!edit.veg} onChange={(v) => setEdit({ ...edit, veg: v })} /> Veg
              </label>
              <label className="flex items-center gap-2 font-medium">
                <Switch on={edit.available !== false} onChange={(v) => setEdit({ ...edit, available: v })} /> Available
              </label>
            </div>
            <div className="flex gap-2">
              {edit.id && (
                <Btn type="button" tone="ghost" onClick={async () => (await items.remove(edit.id!)) && setEdit(null)}>
                  <Trash2 className="size-5 text-rose-700" />
                </Btn>
              )}
              <Btn className="flex-1">Save</Btn>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!editCat} onClose={() => setEditCat(null)} title={editCat?.id ? "Edit category" : "New category"}>
        {editCat && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (await cats.save(editCat)) setEditCat(null);
            }}
          >
            <Field label="Name">
              <input className={inputCls} value={editCat.name ?? ""} onChange={(e) => setEditCat({ ...editCat, name: e.target.value })} required autoFocus />
            </Field>
            <div className="flex gap-2">
              {editCat.id && (
                <Btn
                  type="button"
                  tone="ghost"
                  onClick={async () => {
                    if (await cats.remove(editCat.id!)) {
                      setEditCat(null);
                      setCat("all");
                    }
                  }}
                >
                  <Trash2 className="size-5 text-rose-700" />
                </Btn>
              )}
              <Btn className="flex-1">Save</Btn>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? "bg-emerald-600" : "bg-stone-300"}`}
    >
      <motion.span layout className={`absolute top-1 size-5 rounded-full bg-white shadow ${on ? "right-1" : "left-1"}`} />
    </button>
  );
}

/* ───────────── Users ───────────── */

function UsersAdmin() {
  const myId = useLive().me?.id;
  const { rows, save, remove } = useEntity<PublicUser>("users");
  const roles = useEntity<Role>("roles");
  const [edit, setEdit] = useState<(Partial<PublicUser> & { password?: string }) | null>(null);
  const role = (id?: string) => roles.rows?.find((r) => r.id === id);

  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {rows?.map((u) => (
          <motion.button
            layout
            key={u.id}
            onClick={() => setEdit(u)}
            className={`flex items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-stone-200 ${u.active ? "" : "opacity-50"}`}
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white" style={{ background: role(u.roleId)?.color }}>
              {u.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{u.name}</p>
              <p className="truncate text-xs text-stone-500">{u.email}</p>
            </div>
            <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: role(u.roleId)?.color }}>
              {role(u.roleId)?.name}
            </span>
          </motion.button>
        ))}
        <AddTile className="min-h-[68px]" onClick={() => setEdit({ roleId: "waiter", active: true })} />
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit user" : "New user"}>
        {edit && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (await save(edit)) setEdit(null);
            }}
          >
            <Field label="Name">
              <input className={inputCls} value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required />
            </Field>
            <Field label="Email">
              <input type="email" className={inputCls} value={edit.email ?? ""} onChange={(e) => setEdit({ ...edit, email: e.target.value })} required />
            </Field>
            <Field label={edit.id ? "New password (optional)" : "Password"}>
              <input
                type="text"
                autoComplete="new-password"
                className={inputCls}
                value={edit.password ?? ""}
                onChange={(e) => setEdit({ ...edit, password: e.target.value })}
                required={!edit.id}
                minLength={6}
              />
            </Field>
            <Field label="Role">
              <div className="flex flex-wrap gap-2">
                {roles.rows?.map((r) => (
                  <button
                    type="button"
                    key={r.id}
                    disabled={edit.id === myId}
                    onClick={() => setEdit({ ...edit, roleId: r.id })}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold transition disabled:opacity-50 ${
                      edit.roleId === r.id ? "text-white" : "bg-white ring-1 ring-stone-200"
                    }`}
                    style={edit.roleId === r.id ? { background: r.color } : undefined}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            </Field>
            {edit.id !== myId && (
              <label className="mb-4 flex items-center gap-2 font-medium">
                <Switch on={edit.active !== false} onChange={(v) => setEdit({ ...edit, active: v })} /> Active
              </label>
            )}
            <div className="flex gap-2">
              {edit.id && edit.id !== myId && (
                <Btn type="button" tone="ghost" onClick={async () => (await remove(edit.id!)) && setEdit(null)}>
                  <Trash2 className="size-5 text-rose-700" />
                </Btn>
              )}
              <Btn className="flex-1">Save</Btn>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

/* ───────────── Roles ───────────── */

const GROUPS: { label: string; perms: Permission[] }[] = [
  { label: "Floor", perms: ["floor.view", "order.take", "order.serve", "order.cancel"] },
  { label: "Kitchen", perms: ["kitchen.view"] },
  { label: "Billing", perms: ["bill.mark", "bill.settle"] },
  { label: "Admin", perms: ["admin.tables", "admin.menu", "admin.users", "admin.roles"] },
];

function RolesAdmin() {
  const { rows, save, remove } = useEntity<Role>("roles");
  const [edit, setEdit] = useState<Partial<Role> | null>(null);
  const toggle = (p: Permission) =>
    edit && setEdit({ ...edit, permissions: edit.permissions?.includes(p) ? edit.permissions.filter((x) => x !== p) : [...(edit.permissions ?? []), p] });

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {rows?.map((r) => (
          <motion.button
            layout
            key={r.id}
            onClick={() => setEdit(r)}
            className="overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-stone-200"
          >
            <div className="flex items-center gap-2 px-4 py-3 text-white" style={{ background: r.color }}>
              <Shield className="size-5" />
              <span className="font-bold">{r.name}</span>
              {r.system && <Lock className="ml-auto size-4 opacity-80" />}
            </div>
            <div className="flex flex-wrap gap-1 p-3">
              {r.permissions.map((p) => (
                <span key={p} className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] text-stone-600">
                  {PERMISSIONS[p]}
                </span>
              ))}
            </div>
          </motion.button>
        ))}
        <AddTile className="min-h-28" onClick={() => setEdit({ name: "", color: "#57534e", permissions: ["floor.view"] })} />
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit role" : "New role"}>
        {edit && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (await save(edit)) setEdit(null);
            }}
          >
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <Field label="Name">
                <input className={inputCls} value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required />
              </Field>
              <Field label="Colour">
                <input type="color" className="h-11 w-14 cursor-pointer rounded-xl border border-stone-200 bg-white p-1" value={edit.color} onChange={(e) => setEdit({ ...edit, color: e.target.value })} />
              </Field>
            </div>
            {GROUPS.map((g) => (
              <div key={g.label} className="mb-3">
                <p className="mb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">{g.label}</p>
                <div className="space-y-1">
                  {g.perms.map((p) => (
                    <label key={p} className={`flex items-center gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-stone-200 ${edit.system ? "opacity-60" : ""}`}>
                      <input
                        type="checkbox"
                        className="size-5 accent-maroon"
                        checked={edit.system || !!edit.permissions?.includes(p)}
                        disabled={edit.system}
                        onChange={() => toggle(p)}
                      />
                      <span className="text-sm">{PERMISSIONS[p]}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <p className="mb-3 text-xs text-stone-400">{ALL_PERMISSIONS.length} permissions · changes apply on next refresh</p>
            <div className="flex gap-2">
              {edit.id && !edit.system && (
                <Btn type="button" tone="ghost" onClick={async () => (await remove(edit.id!)) && setEdit(null)}>
                  <Trash2 className="size-5 text-rose-700" />
                </Btn>
              )}
              <Btn className="flex-1">Save</Btn>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
