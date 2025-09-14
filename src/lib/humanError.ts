// src/lib/humanError.ts
export function humanError(e: any): string {
  // Supabase/PostgREST
  if (e?.message) return String(e.message);

  // JS generici
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return "Errore sconosciuto";
  }
}