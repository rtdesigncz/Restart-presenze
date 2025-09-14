// src/app/settings/page.tsx
"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabaseClient";
import { humanError } from "@/lib/humanError";
import { useToast } from "@/components/ToastProvider";

type Instructor = {
  id: string;
  full_name: string | null;
  email: string | null;
  ruolo: "admin" | "istruttore";
};

export default function SettingsPage() {
  const toast = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [list, setList] = useState<Instructor[]>([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", pin: "" });

  const load = async () => {
    setLoading(true);
    try {
      const { data: adminFlag, error: eAdmin } = await supabase.rpc("is_admin");
      if (eAdmin) {
        toast.push(humanError(eAdmin), "error");
        setIsAdmin(false);
        return;
      }
      if (!adminFlag) {
        setIsAdmin(false);
        return;
      }
      setIsAdmin(true);

      const { data, error } = await supabase.rpc("list_istruttori_with_email");
      if (error) {
        toast.push(humanError(error), "error");
        setList([]);
      } else {
        setList((data || []) as Instructor[]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="card p-5">Pagina riservata agli amministratori.</div>
      </AppShell>
    );
  }

  const createInstructor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.push("Compila nome, email e password.", "info");
      return;
    }

    try {
      const res = await fetch("/api/admin/create-instructor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          p_full_name: form.name.trim(),
          p_email: form.email.trim(),
          p_password: form.password,
          p_pin: form.pin.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.push(json?.error || "Errore nella creazione.", "error");
      } else if (json?.warning) {
        toast.push(json.warning, "info");
        setForm({ name: "", email: "", password: "", pin: "" });
        load();
      } else {
        toast.push("Istruttore creato.", "success");
        setForm({ name: "", email: "", password: "", pin: "" });
        load();
      }
    } catch (err: any) {
      toast.push(err?.message || "Errore di rete.", "error");
    }
  };

  const resetPassword = async (id: string) => {
    const pwd = window.prompt("Nuova password per questo istruttore:");
    if (!pwd) return;
    const { error } = await supabase.rpc("admin_set_password", { p_user_id: id, p_new_password: pwd });
    if (error) toast.push(humanError(error), "error");
    else toast.push("Password aggiornata.", "success");
  };

  const resetPIN = async (id: string) => {
    const pin = window.prompt("Nuovo PIN (4-6 cifre) per questo istruttore:");
    if (!pin) return;
    const { error } = await supabase.rpc("admin_set_pin", { p_user_id: id, p_new_pin: pin });
    if (error) toast.push(humanError(error), "error");
    else toast.push("PIN aggiornato.", "success");
  };

  const removeInstructor = async (id: string, name: string | null) => {
    const ok1 = window.confirm(`Eliminare definitivamente l’istruttore "${name || id}"?`);
    if (!ok1) return;
    const ok2 = window.prompt('Scrivi "ELIMINA" in maiuscolo per confermare:');
    if (ok2 !== "ELIMINA") {
      toast.push("Operazione annullata.", "info");
      return;
    }

    const { error } = await supabase.rpc("admin_delete_instructor", { p_user_id: id });
    if (error) toast.push(humanError(error), "error");
    else {
      toast.push("Istruttore eliminato.", "success");
      load();
    }
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="card p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">Impostazioni • Gestione Istruttori</div>
              <div className="text-sm text-slate-600">Crea, modifica o rimuovi istruttori. Imposta password e PIN.</div>
            </div>
          </div>
        </div>

        <div className="card p-4 border-slate-200">
          <div className="text-base font-semibold mb-3">Aggiungi istruttore</div>
          <form onSubmit={createInstructor} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm text-slate-700 mb-1">Nome</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Es. Mario Rossi"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-slate-700 mb-1">Email</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="mario@esempio.it"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-slate-700 mb-1">Password</label>
              <input
                type="password"
                className="input"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm text-slate-700 mb-1">PIN (opzionale)</label>
              <input
                className="input"
                value={form.pin}
                onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value }))}
                placeholder="4-6 cifre"
              />
            </div>
            <div className="md:col-span-4 flex justify-end">
              <button type="submit" className="btn btn-brand">Crea istruttore</button>
            </div>
          </form>
        </div>

        <div className="card border-slate-200">
          <div className="p-3 border-b">
            <div className="text-base font-semibold">Istruttori</div>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-4 text-sm text-slate-600">Caricamento…</div>
            ) : list.length === 0 ? (
              <div className="p-4 text-sm text-slate-600">Nessun istruttore presente.</div>
            ) : (
              <table className="table-flat table-compact w-full text-sm">
                <thead>
                  <tr>
                    <th className="th">Nome</th>
                    <th className="th">Email</th>
                    <th className="th">Ruolo</th>
                    <th className="th">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((it) => (
                    <tr key={it.id} className="border-t">
                      <td className="td">{it.full_name || "—"}</td>
                      <td className="td">{it.email || "—"}</td>
                      <td className="td">{it.ruolo}</td>
                      <td className="td">
                        <div className="flex flex-wrap gap-2">
                          <button className="btn btn-ghost btn-xs" onClick={() => resetPassword(it.id)}>
                            Reset password
                          </button>
                          <button className="btn btn-ghost btn-xs" onClick={() => resetPIN(it.id)}>
                            Imposta PIN
                          </button>
                          <button className="btn btn-danger btn-xs" onClick={() => removeInstructor(it.id, it.full_name)}>
                            Elimina
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}