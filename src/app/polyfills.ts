// src/app/polyfills.ts

// Polyfill ES features per Safari/iOS vecchi (Object.*, Array.*, Promise.finally, ecc.)
import "core-js/stable";
// Polyfill generator/async-await
import "regenerator-runtime/runtime";
// Fetch API
import "whatwg-fetch";

// Mini diagnostica: se qualcosa esplode su device vecchi, mostra una barra rossa in fondo con l’errore
if (typeof window !== "undefined") {
  const isOldIOS = /iP(ad|hone|od).+OS [0-1][0-2]_\d/i.test(navigator.userAgent) || /OS 1[0-2]_/.test(navigator.userAgent);
  if (isOldIOS) {
    const show = (msg: string) => {
      const bar = document.createElement("div");
      bar.style.position = "fixed";
      bar.style.left = "0";
      bar.style.right = "0";
      bar.style.bottom = "0";
      bar.style.zIndex = "999999";
      bar.style.background = "#fee2e2";
      bar.style.color = "#991b1b";
      bar.style.font = "12px/1.4 -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial";
      bar.style.padding = "8px 10px";
      bar.style.borderTop = "1px solid #fecaca";
      bar.textContent = "Errore runtime: " + msg;
      document.body.appendChild(bar);
      setTimeout(() => bar.remove(), 8000);
    };
    window.addEventListener("error", (e) => { if (e?.error?.message) show(e.error.message); });
    window.addEventListener("unhandledrejection", (e: any) => { const m = e?.reason?.message || String(e?.reason || "Promise rejection"); show(m); });
  }
}