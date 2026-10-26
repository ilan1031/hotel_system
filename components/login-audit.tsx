"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Check, Globe, Loader2, MapPin, Smartphone, X } from "lucide-react";
import { api } from "@/lib/client";
import { describeDevice } from "@/lib/device";
import type { LoginEvent } from "@/lib/types";

/** Owner-only list of every sign-in attempt for a day: who, device, IP and approximate location. */
export function LoginAudit() {
  const [day, setDay] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [rows, setRows] = useState<LoginEvent[] | null>(null);
  const [onlyFailed, setOnlyFailed] = useState(false);

  useEffect(() => {
    let live = true;
    api<LoginEvent[]>(`/api/audit/logins?day=${day}`)
      .then((r) => live && setRows(r))
      .catch(() => live && setRows([]));
    return () => {
      live = false;
    };
  }, [day]);

  const list = (rows ?? []).filter((r) => !onlyFailed || !r.ok);
  const failed = (rows ?? []).filter((r) => !r.ok).length;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm">
          <CalendarDays className="size-4 text-stone-500" />
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="bg-transparent text-sm outline-none" />
        </label>
        <button
          onClick={() => setOnlyFailed(!onlyFailed)}
          aria-pressed={onlyFailed}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold shadow-sm ${
            onlyFailed ? "bg-rose-700 text-white" : "bg-white text-rose-700"
          }`}
        >
          <X className="size-4" /> Failed {failed}
        </button>
        <span className="ml-auto text-sm text-stone-500">{rows ? `${rows.length} sign-ins` : ""}</span>
      </div>

      {!rows && <Loader2 className="mx-auto mt-10 size-7 animate-spin text-maroon" />}
      {rows && !list.length && <p className="py-10 text-center text-stone-400">—</p>}

      <div className="grid gap-2 lg:grid-cols-2">
        {list.map((r, i) => {
          const place = [r.city, r.region, r.country].filter(Boolean).join(", ");
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
              className={`rounded-2xl bg-white p-3 shadow-sm ring-1 ${r.ok ? "ring-stone-200" : "ring-rose-300"}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-white ${r.ok ? "bg-emerald-600" : "bg-rose-700"}`}
                  aria-label={r.ok ? "Signed in" : "Failed sign-in"}
                >
                  {r.ok ? <Check className="size-4" /> : <X className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.name ?? r.email}</p>
                  {r.name && <p className="truncate text-xs text-stone-500">{r.email}</p>}
                </div>
                <span className="text-sm text-stone-500 tabular-nums">
                  {new Date(r.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-stone-600">
                <li className="flex items-center gap-2">
                  <Smartphone className="size-4 shrink-0 text-stone-400" />
                  <span className="min-w-0 truncate">{describeDevice(r.device) || "Unknown device"}</span>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="size-4 shrink-0 text-stone-400" />
                  {place ? (
                    r.lat && r.lon ? (
                      <a
                        href={`https://www.google.com/maps?q=${r.lat},${r.lon}`}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-maroon underline-offset-2 hover:underline"
                      >
                        {place}
                      </a>
                    ) : (
                      <span className="truncate">{place}</span>
                    )
                  ) : (
                    <span className="text-stone-400">Location not available</span>
                  )}
                </li>
                {r.ip && (
                  <li className="flex items-center gap-2">
                    <Globe className="size-4 shrink-0 text-stone-400" />
                    <span className="font-mono text-xs">{r.ip}</span>
                  </li>
                )}
              </ul>
            </motion.div>
          );
        })}
      </div>
    </>
  );
}
