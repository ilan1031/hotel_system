import "server-only";
import { headers } from "next/headers";
import type { DeviceInfo, Guest, Me, Order } from "./types";

// Device + location for the audit trail. Device details are only shown to the owner and to the
// built-in Admin role; everyone else gets them stripped server-side.

const clip = (v: unknown, n = 60) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : undefined);

export function readDevice(h: Headers): DeviceInfo {
  try {
    const d = JSON.parse(decodeURIComponent(h.get("x-pv-device") ?? "")) as DeviceInfo;
    return { label: clip(d.label, 40), model: clip(d.model), os: clip(d.os, 30), browser: clip(d.browser, 30) };
  } catch {
    return {};
  }
}

/** Short device name stored on each action: the staff-given name, else model, else OS + browser. */
export function deviceTag(d: DeviceInfo) {
  return d.label || d.model || [d.os, d.browser].filter(Boolean).join(" ") || undefined;
}

/** Device tag for the request being handled (call inside a route handler). */
export async function currentDevice() {
  return deviceTag(readDevice(await headers()));
}

const decode = (v: string | null) => {
  if (!v) return undefined;
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
};

/** IP and approximate location. Vercel adds the x-vercel-ip-* headers; locally there are none. */
export function readPlace(h: Headers) {
  return {
    ip: clip(h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip"), 64),
    city: clip(decode(h.get("x-vercel-ip-city"))),
    region: clip(h.get("x-vercel-ip-country-region"), 20),
    country: clip(h.get("x-vercel-ip-country"), 8),
    lat: clip(h.get("x-vercel-ip-latitude"), 16),
    lon: clip(h.get("x-vercel-ip-longitude"), 16),
  };
}

export const canSeeDevices = (me: Me) => !!me.owner || !!me.role.system;

/** Remove device fields for viewers who may not see them. */
export function stripDevices<G extends Guest, O extends Order>(me: Me, guests: G[], orders: O[]) {
  if (canSeeDevices(me)) return { guests, orders };
  return {
    guests: guests.map((g) => ({ ...g, openedOn: undefined, billedOn: undefined, closedOn: undefined })),
    orders: orders.map((o) => ({
      ...o,
      createdOn: undefined,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      lines: o.lines.map((l) => ({ ...l, log: l.log?.map(({ d, ...e }) => e) })),
    })),
  };
}
