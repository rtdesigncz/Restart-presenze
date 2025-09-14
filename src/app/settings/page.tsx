// src/app/settings/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ToastProvider";
import { humanError } from "@/lib/humanError";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: "admin" | "istruttore"; // <-- enum DB
  is_active: boolean;
  pin_set_at: string | null;
};

export default function SettingsPage() {
  const toast = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [list, setList] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // form nuovo istruttore
  const [nFullName, setNFullName] = useState("");
  const [nEmail, setNEmail] = useState("");
  const [nPassword, setNPassword] = useState("");
  const [nPin, setNPin] = useState("");
  const [nRole, setNRole] = useState<"istruttore" | "admin">("istruttore"); // <-- default corretto
  const [nActive, setNActive] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);

    // Verifica admin
    const { data: adminFlag, error: errAdmin } = await supabase.rpc("is_admin");
    if (errAdmin) {
      toast.push(humanError(errAdmin), "error");
      setLoading(false);
      return;
    }
    setIsAdmin(!!adminFlag);

    if (!adminFlag) {
      setList([]);
      setLoading(false);
      return;
    }

    // Lista profili (bypassa RLS, filtra eliminati dentro la RPC)
    const { data, error } = await supabase.rpc("list_profiles_admin");
    if (error) {
      toast.push(humanError(error), "error");
      setList([]);
    } else {
      setList((data || []) as any);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setPin = async (id: string) => {
    const pin = window.prompt("Imposta PIN (solo cifre, min 4). Lascia vuoto per rimuovere:", "");
    if (pin === null) return;
    const { error } = await supabase.rpc("admin_set_pin", { p_user: id, p_pin: pin || null });
    if (error) toast.push(humanError(error), "error");
    else {
      toast.push(pin ? "PIN aggiornato." : "PIN rimosso.", "success");
      load();
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    const next = !current;
    const ok = window.confirm(
      next
        ? "Vuoi RIATTIVARE questo istruttore?"
        : "Sei sicuro di DISATTIVARE questo istruttore? Non potrà più inserire ore e scomparirà dal Kiosk."
    );
    if (!ok) return;

    const { error } = await supabase.rpc("admin_set_active", { p_user: id, p_active: next });
    if (error) toast.push(humanError(error), "error");
    else {
      toast.push(next ? "Istruttore riattivato." : "Istruttore disattivato.", "success");
      load();
    }
  };

  const hardDelete = async (p: Profile) => {
    const step1 = window.prompt(
      `ATTENZIONE: l'operazione è DEFINITIVA lato dati applicativi (ore & audit rimossi, profilo eliminato).\n` +
      `Per confermare digita: ELIMINA`
    );
    if (step1 === null) return;
    if (step1.trim() !== "ELIMINA") {
      toast.push("Conferma non valida. Digita esattamente: ELIMINA", "error");
      return;
    }

    const label = p.email || "";
    const step2 = window.prompt(
      `Per sicurezza, digita l'email esatta dell'utente da eliminare:\n${label}`
    );
    if (step2 === null) return;
    if ((step2.trim().toLowerCase() || "") !== (label.toLowerCase() || "")) {
      toast.push("Email non corrispondente. Operazione annullata.", "error");
      return;
    }

    const { error } = await supabase.rpc("admin_delete_user_hard", { p_user: p.id });
    if (error) {
      toast.push(humanError(error), "error");
    } else {
      toast.push("Utente eliminato definitivamente (lato dati applicativi).", "success");
      load();
    }
  };

  const createInstructor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nFullName.trim() || !nEmail.trim() || !nPassword.trim()) {
      toast.push("Compila nome, email e password.", "error");
      return;
    }
    setCreating(true);
    try {
      // Prendi il JWT corrente e passalo come Bearer
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) {
        toast.push("Sessione scaduta. Riesegui il login.", "error");
        setCreating(false);
        return;
      }

      const res = await fetch("/api/admin/create-instructor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: nFullName.trim(),
          email: nEmail.trim(),
          password: nPassword,
          role: nRole, // <-- 'istruttore' | 'admin'
          is_active: nActive,
          pin: nPin.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.push(json?.error || "Operazione non consentita o dati non validi.", "error");
      } else {
        if (json?.warning) {
          toast.push(json.warning, "warning");
        } else {
          toast.push("Istruttore creato.", "success");
        }
        setNFullName("");
        setNEmail("");
        setNPassword("");
        setNPin("");
        setNRole("istruttore");
        setNActive(true);
        load();
      }
    } catch (err: any) {
      toast.push(err?.message || "Errore di rete.", "error");
    } finally {
      setCreating(false);
    }
  };

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="card p-5">Questa pagina è riservata agli amministratori.</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Impostazioni</h1>
          <div className="text-sm text-slate-500">
            Totale profili: <span className="font-medium">{list.length}</span>
          </div>
        </div>

        {/* === FORM NUOVO ISTRUTTORE === */}
        <form onSubmit={createInstructor} className="card border-slate-200 p-4 space-y-3">
          <div className="text-lg font-medium">Aggiungi istruttore</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-700 mb-1">Nome e cognome</label>
              <input
                className="input"
                value={nFullName}
                onChange={(e) => setNFullName(e.target.value)}
                placeholder="Es. Marco Rossi"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-slate-700 mb-1">Email</label>
              <input
                type="email"
                className="input"
                value={nEmail}
                onChange={(e) => setNEmail(e.target.value)}
                placeholder="nome@dominio.it"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-slate-700 mb-1">Password</label>
              <input
                type="password"
                className="input"
                value={nPassword}
                onChange={(e) => setNPassword(e.target.value)}
                placeholder="Almeno 6 caratteri"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-slate-700 mb-1">PIN (opzionale)</label>
              <input
                className="input"
                value={nPin}
                onChange={(e) => setNPin(e.target.value.replace(/\D+/g, ""))}
                placeholder="Min 4 cifre"
                maxLength={8}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-700 mb-1">Ruolo</label>
              <select className="select" value={nRole} onChange={(e) => setNRole(e.target.value as any)}>
                <option value="istruttore">Istruttore</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                id="active"
                type="checkbox"
                className="check-lg"
                checked={nActive}
                onChange={(e) => setNActive(e.target.checked)}
              />
              <label htmlFor="active" className="text-sm">Attivo</label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="submit" className="btn btn-brand" disabled={creating}>
              {creating ? "Creazione…" : "Crea istruttore"}
            </button>
          </div>
        </form>

        {/* === LISTA PROFILI === */}
        <div className="card border-slate-200">
          <div className="overflow-x-auto rounded-lg">
            <table className="table-flat table-compact w-full text-sm">
              <thead>
                <tr>
                  <th className="th">Nome</th>
                  <th className="th">Email</th>
                  <th className="th">Ruolo</th>
                  <th className="th">Stato</th>
                  <th className="th">PIN</th>
                  <th className="th">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="td">{p.full_name || "—"}</td>
                    <td className="td">{p.email || "—"}</td>
                    <td className="td">{p.role}</td>
                    <td className="td">
                      {p.is_active ? (
                        <span className="tag border-emerald-500 text-emerald-700 bg-emerald-50">Attivo</span>
                      ) : (
                        <span className="tag border-slate-400 text-slate-600 bg-slate-50">Disattivo</span>
                      )}
                    </td>
                    <td className="td">
                      {p.pin_set_at ? (
                        <span className="text-emerald-700">Impostato</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="td">
                      <div className="flex flex-wrap gap-2">
                        <button className="btn btn-ghost btn-xs" onClick={() => setPin(p.id)}>
                          {p.pin_set_at ? "Modifica PIN" : "Imposta PIN"}
                        </button>
                        <button
                          className={p.is_active ? "btn btn-danger btn-xs" : "btn btn-brand btn-xs"}
                          onClick={() => toggleActive(p.id, p.is_active)}
                        >
                          {p.is_active ? "Disattiva" : "Riattiva"}
                        </button>
                        {p.role !== "admin" && (
                          <button
                            className="btn btn-danger btn-xs"
                            onClick={() => hardDelete(p)}
                            title="Elimina definitivamente questo utente"
                          >
                            Elimina definitivamente
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {list.length === 0 && !loading && (
                  <tr>
                    <td className="td" colSpan={6}>
                      <div className="p-5 text-slate-600">Nessun profilo trovato.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {loading && <div className="p-3 text-sm text-slate-500">Caricamento…</div>}
        </div>
      </div>
    </AppShell>
  );
}