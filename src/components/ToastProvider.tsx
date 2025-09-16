// src/components/ToastProvider.tsx
"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastKind = "success" | "error" | "info";
type Toast = { id: string; text: string; kind: ToastKind };

type ToastCtx = {
  push: (text: string, kind?: ToastKind) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const push = useCallback((text: string, kind: ToastKind = "info") => {
    const id = Math.random().toString(36).slice(2, 9);
    setItems((prev) => [...prev, { id, text, kind }]);
    // autoclose
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <Ctx.Provider value={value}>
      {children}

      {/* Contenitore toast: NON intercetta tap */}
      <div className="fixed inset-0 z-[60] pointer-events-none">
        <div className="absolute right-3 bottom-3 flex flex-col gap-2 max-w-[90vw] sm:max-w-md">
          {items.map((t) => {
            const cls =
              t.kind === "success"
                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                : t.kind === "error"
                ? "border-red-500 bg-red-50 text-red-800"
                : "border-slate-400 bg-white text-slate-800";
            return (
              <div
                key={t.id}
                className={`pointer-events-auto border rounded-md px-3 py-2 shadow ${cls}`}
                role="status"
              >
                {t.text}
              </div>
            );
          })}
        </div>
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // fallback no-op
    return { push: (_: string) => {} };
  }
  return ctx;
}