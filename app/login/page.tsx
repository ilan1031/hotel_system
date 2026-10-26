"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, LogIn, Lock, Mail } from "lucide-react";
import { api } from "@/lib/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
      </motion.div>
    </main>
  );
}
