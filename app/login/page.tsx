"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Check, Eye, EyeOff, Loader2, LogIn, Lock, Mail, Pencil, Smartphone } from "lucide-react";
import { api } from "@/lib/client";
import { describeDevice, getDevice, getDeviceName, setDeviceName } from "@/lib/device";
import { BuiltBy } from "@/components/brand";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // what this phone/PC will be recorded as in the audit log; staff can give it a name
  const [device, setDevice] = useState("");
  const [naming, setNaming] = useState(false);
  const [deviceName, setDeviceNameInput] = useState(getDeviceName); // input only renders after a tap, so no hydration mismatch

  useEffect(() => {
    getDevice().then((d) => setDevice(describeDevice(d)));
  }, []);

  function saveDeviceName() {
    setDeviceName(deviceName);
    setNaming(false);
    getDevice().then((d) => setDevice(describeDevice(d)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/login", "POST", { email, password });
      window.location.href = "/";
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="bg-kolam relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      {/* soft glowing orbs */}
      <motion.div
        className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-gold/30 blur-3xl"
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-maroon/20 blur-3xl"
        animate={{ x: [0, -40, 0], y: [0, -30, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 16 }}
        className="relative w-full max-w-sm"
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="mx-auto mb-[-36px] w-40 drop-shadow-xl sm:w-44"
        >
          <Image src="/logo.jpg" alt="Periya Veedu" width={352} height={440} priority className="rounded-3xl" />
        </motion.div>

        <form
          onSubmit={submit}
          className="rounded-3xl border border-gold/40 bg-paper/95 p-6 pt-12 shadow-2xl shadow-maroon/10 backdrop-blur"
        >
          <label className="mb-3 flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 focus-within:border-maroon focus-within:ring-2 focus-within:ring-maroon/15">
            <Mail className="size-5 text-stone-400" />
            <input
              type="email"
              required
              autoComplete="username"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 w-full bg-transparent text-base outline-none"
            />
          </label>
          <label className="mb-4 flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 focus-within:border-maroon focus-within:ring-2 focus-within:ring-maroon/15">
            <Lock className="size-5 text-stone-400" />
            <input
              type={show ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 w-full bg-transparent text-base outline-none"
            />
            <button type="button" onClick={() => setShow(!show)} className="text-stone-400" aria-label="Show password">
              {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </label>

          {error && (
            <motion.p
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: [0, -6, 6, -3, 0] }}
              className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={busy}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-maroon font-semibold text-white shadow-lg shadow-maroon/30 transition hover:bg-maroon-dark disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-5 animate-spin" /> : <LogIn className="size-5" />}
            Sign in
          </motion.button>
        </form>

        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-stone-500">
          <Smartphone className="size-3.5 shrink-0" />
          {naming ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveDeviceName();
              }}
              className="flex items-center gap-1"
            >
              <input
                autoFocus
                value={deviceName}
                maxLength={40}
                placeholder="Kitchen tablet"
                onChange={(e) => setDeviceNameInput(e.target.value)}
                className="h-7 w-40 rounded-lg border border-stone-300 bg-white px-2 text-xs outline-none focus:border-maroon"
              />
              <button className="rounded-full p-1 text-emerald-700 hover:bg-emerald-50" aria-label="Save device name">
                <Check className="size-4" />
              </button>
            </form>
          ) : (
            <>
              <span className="truncate">{device || "This device"}</span>
              <button
                type="button"
                onClick={() => setNaming(true)}
                className="rounded-full p-1 hover:bg-stone-100"
                aria-label="Name this device"
              >
                <Pencil className="size-3.5" />
              </button>
            </>
          )}
        </div>
      </motion.div>

      <BuiltBy className="absolute inset-x-0 bottom-4" />
    </main>
  );
}
