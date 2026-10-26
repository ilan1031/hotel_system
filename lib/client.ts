"use client";

import { useEffect, useState } from "react";
import { deviceHeader } from "./device";

/** Re-render every `ms` so timers stay fresh between polls. */
export function useNow(ms = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export async function api<T = unknown>(path: string, method = "GET", body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "x-pv-device": await deviceHeader() };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && !path.includes("/auth/")) window.location.href = "/login";
    throw new Error(data.error || "Something went wrong");
  }
  return data as T;
}

export const minsSince = (t: number, now = Date.now()) => Math.max(0, Math.floor((now - t) / 60000));

let ctx: AudioContext | null = null;
/** Short two-tone chime + vibration for new tickets. */
export function chime(high = false) {
  try {
    ctx ??= new AudioContext();
    const t = ctx.currentTime;
    [0, 0.14].forEach((d, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.frequency.value = (high ? 880 : 660) * (i ? 1.5 : 1);
      g.gain.setValueAtTime(0.0001, t + d);
      g.gain.exponentialRampToValueAtTime(0.25, t + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.25);
      o.connect(g).connect(ctx!.destination);
      o.start(t + d);
      o.stop(t + d + 0.3);
    });
    navigator.vibrate?.([80, 60, 80]);
  } catch {}
}
