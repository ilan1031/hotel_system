"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChefHat, KeyRound, LayoutGrid, Loader2, LogOut, Receipt, Settings } from "lucide-react";
import { api } from "@/lib/client";
import type { Me, Permission } from "@/lib/types";
import { LiveProvider } from "@/components/live";
import { Btn, Field, inputCls, Modal } from "@/components/ui";
import { BuiltBy } from "@/components/brand";

const NAV: { href: string; label: string; icon: typeof LayoutGrid; perms: Permission[] }[] = [
  { href: "/", label: "Tables", icon: LayoutGrid, perms: ["floor.view"] },
  { href: "/kitchen", label: "Kitchen", icon: ChefHat, perms: ["kitchen.view"] },
  { href: "/bills", label: "Bills", icon: Receipt, perms: ["bill.settle"] },
  { href: "/admin", label: "Admin", icon: Settings, perms: ["admin.tables", "admin.menu", "admin.users", "admin.roles"] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [userMenu, setUserMenu] = useState(false);
  const path = usePathname();
  const router = useRouter();

  useEffect(() => {
    api<{ me: Me | null }>("/api/me").then(({ me }) => {
      if (!me) window.location.href = "/login";
      else setMe(me);
    });
  }, []);

  const nav = useMemo(() => (me ? NAV.filter((n) => n.perms.some((p) => me.role.permissions.includes(p))) : []), [me]);
  const active = nav.find((n) => (n.href === "/" ? path === "/" : path.startsWith(n.href)));

  // Send people without access to this page to their first allowed page.
  useEffect(() => {
    if (me && nav.length && !active) router.replace(nav[0].href);
  }, [me, nav, active, router]);

  // The page still renders (hidden, showing its own loader) so Next.js can validate the route.
  if (!me || !active)
    return (
      <LiveProvider me={null}>
        <div className="bg-kolam flex min-h-dvh items-center justify-center">
          {me && !nav.length ? (
            <p className="text-stone-500">No access. Ask admin.</p>
          ) : (
            <Loader2 className="size-8 animate-spin text-maroon" />
          )}
        </div>
        <div hidden>
          <Suspense>{children}</Suspense>
        </div>
      </LiveProvider>
    );

  return (
    <LiveProvider me={me}>
      <div className="bg-kolam min-h-dvh md:pl-20">
        {/* desktop / tablet rail */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-20 flex-col items-center gap-2 border-r border-gold/30 bg-paper/90 py-4 backdrop-blur md:flex">
          <Image src="/logo.jpg" alt="" width={48} height={60} className="mb-3 rounded-lg" />
          {nav.map((n) => (
            <NavItem key={n.href} {...n} active={n === active} />
          ))}
          <button onClick={() => setUserMenu(true)} className="mt-auto flex flex-col items-center gap-1">
            <Avatar me={me} />
          </button>
        </aside>

        <main className="mx-auto max-w-[1600px] px-3 pt-3 pb-28 sm:px-5 md:pb-8">
          <Suspense fallback={<Loader2 className="mx-auto mt-24 size-8 animate-spin text-maroon" />}>{children}</Suspense>
          <BuiltBy className="mt-10" />
        </main>

        {/* phone bottom bar */}
        <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-gold/30 bg-paper/95 backdrop-blur md:hidden">
          <div className="flex items-stretch justify-around px-2">
            {nav.map((n) => (
              <NavItem key={n.href} {...n} active={n === active} />
            ))}
            <button onClick={() => setUserMenu(true)} className="flex flex-1 flex-col items-center justify-center py-2">
              <Avatar me={me} />
            </button>
          </div>
        </nav>
      </div>
      <UserMenu me={me} open={userMenu} onClose={() => setUserMenu(false)} />
    </LiveProvider>
  );
}

function NavItem({ href, label, icon: Icon, active }: (typeof NAV)[number] & { active: boolean }) {
  return (
    <Link href={href} className="relative flex flex-1 flex-col items-center gap-0.5 py-2 md:w-16 md:flex-none md:py-3">
      {active && (
        <motion.span
          layoutId="nav-pill"
          className="absolute inset-x-2 inset-y-1 rounded-2xl bg-maroon/10 md:inset-0"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}
      <Icon className={`relative size-6 ${active ? "text-maroon" : "text-stone-500"}`} />
      <span className={`relative text-[11px] font-semibold ${active ? "text-maroon" : "text-stone-500"}`}>{label}</span>
    </Link>
  );
}

function Avatar({ me }: { me: Me }) {
  return (
    <span
      className="flex size-9 items-center justify-center rounded-full text-sm font-bold text-white ring-2 ring-white"
      style={{ background: me.role.color }}
    >
      {me.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function UserMenu({ me, open, onClose }: { me: Me; open: boolean; onClose: () => void }) {
  const [pw, setPw] = useState(false);
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState("");

  async function changePw(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/api/me", "PATCH", { current: cur, next });
      setMsg("Saved");
      setCur("");
      setNext("");
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={me.name}>
      <div className="mb-4 flex items-center gap-3">
        <Avatar me={me} />
        <div className="min-w-0">
          <p className="truncate text-sm text-stone-500">{me.email}</p>
          <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ background: me.role.color }}>
            {me.role.name}
          </span>
        </div>
      </div>
      {pw ? (
        <form onSubmit={changePw}>
          <Field label="Current password">
            <input type="password" className={inputCls} value={cur} onChange={(e) => setCur(e.target.value)} required />
          </Field>
          <Field label="New password">
            <input type="password" className={inputCls} value={next} onChange={(e) => setNext(e.target.value)} required minLength={6} />
          </Field>
          {msg && <p className="mb-2 text-sm text-stone-600">{msg}</p>}
          <Btn className="w-full">Save</Btn>
        </form>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Btn tone="ghost" onClick={() => setPw(true)}>
            <KeyRound className="size-4" /> Password
          </Btn>
          <Btn
            tone="red"
            onClick={async () => {
              await api("/api/auth/logout", "POST");
              window.location.href = "/login";
            }}
          >
            <LogOut className="size-4" /> Logout
          </Btn>
        </div>
      )}
    </Modal>
  );
}
