// src/lib/dateUtils.ts

/** Ritorna YYYY-MM-DD calcolato in fuso locale (es. Europe/Rome) SENZA usare toISOString(). */
export function todayRomeISO(): string {
  const now = new Date(); // locale
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Millisecondi fino alla prossima mezzanotte locale. */
export function msUntilNextLocalMidnight(): number {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return Math.max(250, next.getTime() - now.getTime());
}