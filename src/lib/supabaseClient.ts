// src/lib/supabaseClient.ts
"use client";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Piccolo check per aiutare il debug in dev
if (!url || !anon) {
  // Non lanciare errori, ma logga chiaramente in console
  // (così capiamo subito se .env.local non è letto)
  console.warn("⚠️ Env mancanti: controlla .env.local (URL o ANON KEY)");
}

export const supabase = createClient(url, anon);