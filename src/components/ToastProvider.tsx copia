// src/components/ToastProvider.tsx
"use client";

import React, { createContext, useContext, useMemo, useRef, useState } from "react";

type Toast = { id: number; text: string; type?: "success" | "error" | "info" };
type Ctx = { push: (text: string, type?: Toast["type"]) => void };

const ToastCtx = createContext<Ctx | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const idRef = useRef(1);

  const push = (text: string, type: Toast["type"] = "info") => {
    const id = idRef.current++;
    setItems((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const ctx = useMemo(() => ({ push }), []);

  return (
    <ToastCtx.Provider value={ctx}>
      {children}
      {/* Container */}
      <div className="fixed z-[100] top-4 right-4 flex flex-col gap-2">
        {items.map((t) => {
          const cls =
            t.type === "success"
              ? "border-emerald-500 bg-emerald-50 text-emerald-800"
              : t.type === "error"
              ? "border-red-500 bg-red-50 text-red-800"
              : "border-slate-300 bg-white text-slate-800";
          return (
            <div
              key={t.id}
              className={`rounded-lg border shadow px-3 py-2 text-sm max-w-xs ${cls}`}
            >
              {t.text}
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}