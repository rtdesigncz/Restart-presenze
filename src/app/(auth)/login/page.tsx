"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import LoadingOverlay from "@/components/LoadingOverlay";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    router.push("/"); // poi questa diventerà la pagina "Oggi"
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <LoadingOverlay show={loading} label="Accesso in corso..." />
      <div className="w-full max-w-md card border-slate-200 p-6">
        <div className="mb-4">
          <div className="text-sm text-[var(--brand-ink)] font-semibold">Restart Fitness Club</div>
          <h1 className="text-2xl font-semibold">Accedi</h1>
          <p className="text-sm text-slate-600">Inserisci le tue credenziali</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-slate-700 mb-1">Email</label>
            <input
              type="email"
              className="input"
              placeholder="nome@dominio.it"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">Password</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {err && <div className="text-sm text-red-600">{err}</div>}

          <button type="submit" className="btn btn-brand w-full mt-2">Entra</button>
        </form>
      </div>
    </main>
  );
}