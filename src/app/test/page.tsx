"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TestSupabasePage() {
  const [status, setStatus] = useState<"idle"|"checking"|"ok"|"error">("idle");
  const [details, setDetails] = useState<string>("");

  useEffect(() => {
    const run = async () => {
      try {
        setStatus("checking");

        // 1) Mostra che le env ci sono (non stampiamo le chiavi intere, solo dominio)
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        setDetails(`URL: ${url}`);

        // 2) Chiamata leggera all'Auth per vedere se risponde
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          setStatus("error");
          setDetails(prev => prev + `\nAuth error: ${error.message}`);
          return;
        }

        // Se va tutto bene, data.session può essere null (nessun login), ed è ok
        setStatus("ok");
        setDetails(prev => prev + `\nAuth ok. Sessione presente: ${!!data.session}`);
      } catch (e: any) {
        setStatus("error");
        setDetails(`Errore generico: ${e?.message || e}`);
      }
    };

    run();
  }, []);

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Test connessione Supabase</h1>

      <div>
        <p className="text-sm text-slate-600 whitespace-pre-wrap">{details}</p>
      </div>

      <div className="mt-2">
        {status === "idle" && <span>In attesa…</span>}
        {status === "checking" && <span>Verifica in corso…</span>}
        {status === "ok" && <span className="text-green-600 font-medium">✅ Connessione OK</span>}
        {status === "error" && <span className="text-red-600 font-medium">❌ Errore (vedi dettagli sopra)</span>}
      </div>
    </main>
  );
}