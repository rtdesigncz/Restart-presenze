// src/components/LoadingOverlay.tsx
"use client";

export default function LoadingOverlay({
  show,
  label = "Caricamento…",
}: {
  show: boolean;
  label?: string;
}) {
  if (!show) return null; // << NON renderizzare nulla se non serve

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center"
      // per sicurezza, blocca gli eventi quando visibile
      style={{ pointerEvents: "auto" }}
      aria-live="polite"
      role="status"
    >
      <div className="bg-white border rounded-lg px-4 py-3 text-sm shadow">
        {label}
      </div>
    </div>
  );
}