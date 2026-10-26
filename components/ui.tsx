"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { LIGHT_META, type Light } from "@/lib/types";

/** Bottom sheet on phones, right drawer on tablets/desktop. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, i) => (i.offset.y > 120 || i.velocity.y > 600) && onClose()}
            className={`absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-3xl bg-paper shadow-2xl md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[440px] md:rounded-none md:rounded-l-3xl ${
              wide ? "lg:w-[560px]" : ""
            }`}
          >
            <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-stone-300 md:hidden" />
            <div className="flex shrink-0 items-center gap-3 px-5 pt-3 pb-2">
              <div className="min-w-0 flex-1">{title}</div>
              <button onClick={onClose} className="rounded-full p-2 text-stone-500 hover:bg-stone-100" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4" onPointerDownCapture={(e) => e.stopPropagation()}>
              {children}
            </div>
            {footer && <div className="pb-safe shrink-0 border-t border-stone-200 bg-paper px-5 py-3">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Centered modal for small forms / confirmations. */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            className="absolute inset-0 bg-ink/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 400, damping: 34 }}
            className="pb-safe relative max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl bg-paper p-5 shadow-2xl sm:max-w-md sm:rounded-3xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">{title}</h3>
              <button onClick={onClose} className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "ghost" | "green" | "blue" | "amber" | "red" | "dark";
  size?: "sm" | "md" | "lg";
};

const TONES = {
  primary: "bg-maroon text-white hover:bg-maroon-dark shadow-md shadow-maroon/20",
  ghost: "bg-white text-ink border border-stone-200 hover:bg-stone-50",
  green: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/25",
  blue: "bg-sky-600 text-white hover:bg-sky-700",
  amber: "bg-amber-500 text-white hover:bg-amber-600",
  red: "bg-rose-700 text-white hover:bg-rose-800 shadow-md shadow-rose-700/25",
  dark: "bg-ink text-white hover:bg-black",
};
const SIZES = { sm: "h-9 px-3 text-sm rounded-xl", md: "h-11 px-4 rounded-2xl", lg: "h-14 px-5 text-lg rounded-2xl" };

export function Btn({ tone = "primary", size = "md", className = "", ...p }: BtnProps) {
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-2 font-semibold transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 ${TONES[tone]} ${SIZES[size]} ${className}`}
    />
  );
}

export function Dot({ light, className = "" }: { light: Light; className?: string }) {
  return <span className={`inline-block size-3 rounded-full ${LIGHT_META[light].dot} ${className}`} />;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-xs font-semibold tracking-wide text-stone-500 uppercase">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  "h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-base outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/15";
