// src/components/NoServiceWorker.tsx
"use client";

/**
 * Kill switch: alla prima visita su questo host,
 * - unregister di TUTTI i service worker
 * - svuota Cache Storage
 * - setta un flag in localStorage per non rifarlo ad ogni pageview
 */
import { useEffect } from "react";

export default function NoServiceWorker() {
  useEffect(() => {
    const KEY = "sw-kill-switch-v1";
    if (typeof window === "undefined") return;
    const already = window.localStorage.getItem(KEY);
    if (already === "done") return;

    const run = async () => {
      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const reg of regs) {
            try { await reg.unregister(); } catch {}
          }
        }
      } catch {}

      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
      } catch {}

      // Piccolo delay per sicurezza, poi segna come fatto
      setTimeout(() => {
        try { window.localStorage.setItem(KEY, "done"); } catch {}
      }, 100);
    };

    run();
  }, []);

  return null;
}