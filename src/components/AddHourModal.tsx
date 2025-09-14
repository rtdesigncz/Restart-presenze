// src/components/AddHourModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import LoadingOverlay from "@/components/LoadingOverlay";
import { humanError } from "@/lib/humanError";
import { useToast } from "@/components/ToastProvider";

const SALE = ["SALA A", "SALA A+B", "SALA B", "SALA C", "SALA B+C", "SALA ATTREZZI"];

// genera opzioni hh:mm ogni 30'
function buildTimeOptions() {
  const opts: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      opts.push(`${hh}:${mm}`);
    }
  }
  return opts;
}
const TIME_OPTS = buildTimeOptions();

type Istruttore = { id: string; full_name: string; email: string };

type Props = {
  show: boolean;
  onClose: () => void;
  onAdded: () => void;
  giornoISO: string; // YYYY-MM-DD
};

export default function AddHourModal({ show, onClose, onAdded, giornoISO }: Props) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [istruttori, setIstruttori] = useState<Istruttore[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");

  const [sala, setSala] = useState(SALE[0]);
  const [dalle, setDalle] = useState("10:00");
  const [alle, setAlle] = useState("11:00");
  const [attivita, setAttivita] = useState("");
  const [sostituzione, setSostituzione] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const toast = useToast();

  // disabilita le opzioni 'alle' <= 'dalle'
  const alleOptions = useMemo(() => {
    const idx = TIME_OPTS.indexOf(dalle);
    if (idx < 0) return TIME_OPTS;
    return TIME_OPTS.slice(idx + 1);
  }, [dalle]);

  useEffect(() => {
    if (!show) return;
    const boot = async () => {
      const { data } = await supabase.rpc("is_admin");
      const admin = !!data;
      setIsAdmin(admin);

      if (admin) {
        const { data: lis } = await supabase.rpc("list_istruttori");
        if (lis && (lis as any[]).length) {
          setIstruttori(lis as Istruttore[]);
          setSelectedUser((lis![0] as Istruttore).id);
        }
      }
    };
    boot();
  }, [show]);

  if (!show) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (!attivita.trim()) {
      const msg = "Inserisci l'attività.";
      setErr(msg);
      toast.push(msg, "error");
      return;
    }
    if (alle <= dalle) {
      const msg = "Orario non valido: l'orario di fine deve essere successivo a quello di inizio.";
      setErr(msg);
      toast.push(msg, "error");
      return;
    }

    setLoading(true);
    let errorMsg: string | null = null;

    if (isAdmin && selectedUser) {
      const { error } = await supabase.rpc("add_ora_for_user", {
        p_user: selectedUser,
        p_giorno: giornoISO,
        p_ora_start: dalle,
        p_ora_end: alle,
        p_sala: sala,
        p_corso: attivita, // mappo Attività -> p_corso
        p_sostituzione: sostituzione,
        p_note: note || null,
      });
      if (error) errorMsg = humanError(error);
    } else {
      const { error } = await supabase.rpc("add_ora", {
        p_giorno: giornoISO,
        p_ora_start: dalle,
        p_ora_end: alle,
        p_sala: sala,
        p_corso: attivita, // mappo Attività -> p_corso
        p_sostituzione: sostituzione,
        p_note: note || null,
      });
      if (error) errorMsg = humanError(error);
    }

    setLoading(false);

    if (errorMsg) {
      setErr(errorMsg);
      toast.push(errorMsg, "error");
      return;
    }

    toast.push(isAdmin ? "Ora aggiunta (approvata)." : "Ora inviata in attesa di approvazione.", "success");
    onAdded();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3">
      <LoadingOverlay show={loading} label="Salvataggio in corso..." />
      <div className="card border-slate-200 p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Aggiungi ore</h2>

        {isAdmin && (
          <div className="mb-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-300 rounded px-2 py-1">
            Inserendo da admin, l’ora viene <b>approvata</b> automaticamente.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Solo admin: seleziona istruttore */}
          {isAdmin && (
            <div>
              <label className="block text-sm text-slate-700 mb-1">Istruttore</label>
              <select
                className="select"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                {istruttori.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-700 mb-1">Sala</label>
            <select value={sala} onChange={(e) => setSala(e.target.value)} className="select">
              {SALE.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Dalle / Alle come SELECT (step 30') */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-700 mb-1">Dalle</label>
              <select className="select" value={dalle} onChange={(e) => setDalle(e.target.value)}>
                {TIME_OPTS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-700 mb-1">Alle</label>
              <select className="select" value={alle} onChange={(e) => setAlle(e.target.value)}>
                {alleOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-700 mb-1">Attività</label>
            <input
              value={attivita}
              onChange={(e) => setAttivita(e.target.value)}
              className="input"
              placeholder="Es. Zumba"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="sost"
              type="checkbox"
              checked={sostituzione}
              onChange={(e) => setSostituzione(e.target.checked)}
              className="check-lg"
            />
            <label htmlFor="sost" className="text-sm text-slate-700">
              Sostituzione
            </label>
          </div>

          <div>
            <label className="block text-sm text-slate-700 mb-1">Note</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} className="input h-20" />
          </div>

          {err && <div className="text-sm text-red-600">{err}</div>}

          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Annulla
            </button>
            <button type="submit" className="btn btn-brand">
              Salva
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}