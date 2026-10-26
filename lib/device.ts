"use client";

import type { DeviceInfo } from "./types";

// Each phone/PC describes itself so actions and logins can be traced to a device.
// Browsers never expose a computer's real name, so we combine what they do allow (phone model on
// Chrome/Android, OS, browser) with an optional name the staff give the device ("Kitchen tablet").

const NAME_KEY = "pv_device_name";

type UAData = {
  getHighEntropyValues?: (hints: string[]) => Promise<{ model?: string; platform?: string; platformVersion?: string }>;
};

function fromUserAgent(ua: string): DeviceInfo {
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Windows/.test(ua)
          ? "Windows"
          : /Mac OS X/.test(ua)
            ? "Mac"
            : /Linux/.test(ua)
              ? "Linux"
              : "";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /SamsungBrowser/.test(ua)
      ? "Samsung Internet"
      : /OPR\//.test(ua)
        ? "Opera"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Chrome\//.test(ua)
            ? "Chrome"
            : /Safari\//.test(ua)
              ? "Safari"
              : "";
  // older Android browsers put the model in the UA: "Android 13; SM-A515F)"
  const model = ua.match(/Android [\d.]+; ([^;)]+?)(?: Build|\))/)?.[1]?.trim();
  return { os, browser, model: model && model !== "K" ? model : undefined };
}

let cached: Promise<DeviceInfo> | null = null;

export function getDevice(): Promise<DeviceInfo> {
  if (typeof navigator === "undefined") return Promise.resolve({});
  cached ??= (async () => {
    const info = fromUserAgent(navigator.userAgent);
    try {
      const uad = (navigator as Navigator & { userAgentData?: UAData }).userAgentData;
      const h = await uad?.getHighEntropyValues?.(["model", "platform", "platformVersion"]);
      if (h?.model) info.model = h.model;
      if (h?.platform === "Windows" && h.platformVersion) info.os = Number(h.platformVersion.split(".")[0]) >= 13 ? "Windows 11" : "Windows 10";
      else if (h?.platform && !info.os) info.os = h.platform;
    } catch {}
    info.label = getDeviceName() || undefined;
    return info;
  })();
  return cached;
}

export function getDeviceName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setDeviceName(name: string) {
  try {
    if (name.trim()) localStorage.setItem(NAME_KEY, name.trim().slice(0, 40));
    else localStorage.removeItem(NAME_KEY);
  } catch {}
  cached = null;
}

/** "Kitchen tablet · SM-T505 · Android · Chrome" — what the login screen shows. */
export const describeDevice = (d: DeviceInfo) => [d.label, d.model, d.os, d.browser].filter(Boolean).join(" · ");

/** Header value sent with every API call. */
export async function deviceHeader() {
  return encodeURIComponent(JSON.stringify(await getDevice()));
}
