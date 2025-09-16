// src/app/kiosk/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ToastProvider";
import { humanError } from "@/lib/humanError";

type Istruttore = { id: string; full_name: string; has_pin: boolean; role: string };
type Prefs = { last_sala: string | null; recent_corsi: string[] | null };

const SALE = ["SALA A", "SALA A+B", "SALA B", "SALA C", "SALA B+C", "SALA ATTREZZI"];
const TABLET_IDLE_SECONDS = 60;

// time options 30'
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

function fmtHumanDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  const fmt = new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const s = fmt.format(date);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function addDaysISO(iso: string, delta: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  date.setDate(date.getDate() + delta);
  return [
    String(date.getFullYear()),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export default function TabletPage() {
  const toast = useToast();

  const [view, setView] = useState<"list" | "pin" | "form">("list");
  const [search, setSearch] = useState("");
  const [istruttori, setIstruttori] = useState<Istruttore[]>([]);
  const [selected, setSelected] = useState<Istruttore | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  const [giorno, setGiorno] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const dateInputRef = useRef<HTMLInputElement>(null);

  // form (come il modal PC)
  const [sala, setSala] = useState<string>(SALE[0]);
  const [dalle, setDalle] = useState<string>("10:00");
  const [alle, setAlle] = useState<string>("11:00");
  const [attivita, setAttivita] = useState("");
  const [sostituzione, setSostituzione] = useState(false);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Prefs>({ last_sala: null, recent_corsi: [] });

  const alleOptions = useMemo(() => {
    const idx = TIME_OPTS.indexOf(dalle);
    if (idx < 0) return TIME_OPTS;
    return TIME_OPTS.slice(idx + 1);
  }, [dalle]);

  // === IDLE SESSION ===
  const idleTimer = useRef<NodeJS.Timeout | null>(null);
  const [idleLeft, setIdleLeft] = useState<number>(TABLET_IDLE_SECONDS);
  const idleTick = useRef<NodeJS.Timeout | null>(null);

  const clearIdle = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (idleTick.current) clearInterval(idleTick.current);
    idleTimer.current = null;
    idleTick.current = null;
  };

  const resetToList = () => {
    setView("list");
    setSelected(null);
    setPin("");
    setPinError(null);
    setErr(null);
    setIdleLeft(TABLET_IDLE_SECONDS);
    clearIdle();
  };

  const bumpIdle = () => {
    if (view === "list") return;
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (!idleTick.current) {
      idleTick.current = setInterval(() => {
        setIdleLeft((s) => (s > 0 ? s - 1 : 0));
      }, 1000);
    }
    setIdleLeft(TABLET_IDLE_SECONDS);
    idleTimer.current = setTimeout(() => {
      resetToList();
    }, TABLET_IDLE_SECONDS * 1000);
  };

  useEffect(() => {
    if (view === "list") {
      clearIdle();
      setIdleLeft(TABLET_IDLE_SECONDS);
      return;
    }
    const handler = () => bumpIdle();
    const handlerVisibility = () => {
      if (document.visibilityState === "visible") bumpIdle();
    };

    window.addEventListener("click", handler);
    window.addEventListener("keydown", handler);
    window.addEventListener("touchstart", handler);
    window.addEventListener("pointerdown", handler);
    window.addEventListener("mousemove", handler);
    document.addEventListener("visibilitychange", handlerVisibility);

    bumpIdle();

    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("touchstart", handler);
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("mousemove", handler);
      document.removeEventListener("visibilitychange", handlerVisibility);
      clearIdle();
    };
  }, [view]);

  // Carica istruttori (RPC già filtra NON admin; rifiltro per sicurezza)
  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("list_istruttori_public");
      if (Array.isArray(data)) {
        const onlyUsers = (data as Istruttore[]).filter((i) => i.role !== "admin");
        setIstruttori(onlyUsers);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return istruttori;
    return istruttori.filter((i) => i.full_name.toLowerCase().includes(term));
  }, [istruttori, search]);

  const openDatePicker = () => {
    const el = dateInputRef.current;
    // @ts-ignore
    if (el?.showPicker) el.showPicker();
    else el?.click();
  };

  const selectIstruttore = (it: Istruttore) => {
    setSelected(it);
    setPin("");
    setPinError(null);
    setView("pin");
  };

  const loadPrefsAndGoForm = async () => {
    if (!selected) return;
    const { data: pr } = await supabase.rpc("recent_prefs", { p_user: selected.id });
    const p = (pr as any) || {};
    setPrefs({ last_sala: p.last_sala ?? null, recent_corsi: p.recent_corsi ?? [] });
    if (p.last_sala && SALE.includes(p.last_sala)) setSala(p.last_sala);
    else setSala(SALE[0]);
    setDalle("10:00");
    setAlle("11:00");
    setAttivita("");
    setSostituzione(false);
    setNote("");
    setErr(null);
    setView("form");
  };

  const verifyPinAndLoad = async () => {
    if (!selected) return;
    if (!pin || pin.length < 4) {
      setPinError("Inserisci il PIN (almeno 4 cifre).");
      return;
    }
    const { data: ok, error } = await supabase.rpc("verify_pin", {
      p_user: selected.id,
      p_pin: pin,
    });
    if (error || !ok) {
      setPinError("PIN non valido.");
      return;
    }
    await loadPrefsAndGoForm();
  };

  const submit = async () => {
    if (!selected) return;

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
    setErr(null);

    const { error } = await supabase.rpc("add_ora_kiosk", {
      p_user: selected.id,
      p_pin: pin,
      p_giorno: giorno,
      p_ora_start: dalle,
      p_ora_end: alle,
      p_sala: sala,
      p_corso: attivita, // Attività -> p_corso
      p_sostituzione: sostituzione,
      p_note: note || null,
    });
    if (error) {
      const msg = humanError(error);
      setErr(msg);
      toast.push(msg, "error");
      return;
    }

    toast.push("Ora inviata in attesa di approvazione.", "success");

    // reset soft per inserimenti successivi
    setDalle("10:00");
    setAlle("11:00");
    setAttivita("");
    setSostituzione(false);
    setNote("");
    setErr(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header Tablet */}
      <header className="bg-white border-b">
        <div className="max-w-[1200px] mx-auto px-4 lg:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-restart.png"
              alt="Restart"
              width={140}
              height={140}
              className="rounded"
              priority
            />
            <div>
              <div className="text-lg font-semibold leading-tight">Modalità Tablet</div>
              <div className="text-xs text-slate-500">Inserimento rapido ore</div>
            </div>
          </div>

          {view !== "list" ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-sm text-slate-700">
                Ciao, <span className="font-medium">{selected?.full_name}</span>
              </div>
              <span className="tag">Auto-logout {idleLeft}s</span>
              <button className="btn btn-ghost" onClick={resetToList}>Cambia utente</button>
            </div>
          ) : (
            <div className="text-xs text-slate-500">Tablet condiviso</div>
          )}
        </div>
      </header>

      {/* Contenuti */}
      <main className="flex-1">
        {view === "list" && (
          <div className="max-w-3xl mx-auto px-4 py-6">
            <h1 className="text-2xl font-semibold mb-4 text-center">Seleziona Istruttore</h1>
            <div className="mb-4">
              <input
                className="input w-full h-11"
                placeholder="Cerca istruttore..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map((it) => (
                <button
                  key={it.id}
                  onClick={() => selectIstruttore(it)}
                  className="h-20 rounded-xl border bg-white shadow-sm active:scale-[.99] px-3 text-left"
                >
                  <div className="font-medium">{it.full_name}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {it.has_pin ? "PIN attivo" : "PIN mancante"}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {view === "pin" && (
          <div className="max-w-md mx-auto px-4 py-6">
            <div className="card p-5 border-slate-200">
              <div className="text-lg font-semibold mb-1">{selected?.full_name}</div>
              <div className="text-sm text-slate-500 mb-4">Inserisci il tuo PIN a 4 cifre</div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                {[1,2,3,4,5,6,7,8,9,"←",0,"OK"].map((k, idx) => (
                  <button
                    key={idx}
                    className="h-14 rounded-xl border bg-white text-lg font-semibold"
                    onClick={() => {
                      if (k === "←") setPin((p) => p.slice(0, -1));
                      else if (k === "OK") verifyPinAndLoad();
                      else setPin((p) => (p + String(k)).slice(0, 6));
                      setPinError(null);
                      bumpIdle();
                    }}
                  >
                    {typeof k === "number" ? k : k}
                  </button>
                ))}
              </div>

              <div className="text-center text-2xl tracking-[.3em] mb-3">
                {pin.replace(/./g, "•")}
              </div>
              {pinError && <div className="text-sm text-red-600 mb-3">{pinError}</div>}

              <div className="flex justify-center">
                <button className="btn btn-brand w-full" onClick={verifyPinAndLoad}>
                  Continua
                </button>
              </div>
            </div>
          </div>
        )}

        {view === "form" && (
          <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
            <div className="card p-5 border-slate-200 space-y-4">
              {/* Data + frecce */}
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2">
                  <button className="btn btn-ghost" onClick={() => setGiorno((d) => addDaysISO(d, -1))}>←</button>
                  <button
                    type="button"
                    className="tag text-base px-3 py-2"
                    onClick={openDatePicker}
                  >
                    {fmtHumanDate(giorno)}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setGiorno((d) => addDaysISO(d, +1))}>→</button>
                  <input
                    ref={dateInputRef}
                    type="date"
                    className="sr-only pointer-events-none"
                    tabIndex={-1}
                    aria-hidden="true"
                    value={giorno}
                    onChange={(e) => setGiorno(e.target.value)}
                  />
                </div>
              </div>

              {/* Sala */}
              <div>
                <label className="block text-sm text-slate-700 mb-1">Sala</label>
                <select className="select h-11" value={sala} onChange={(e) => setSala(e.target.value)}>
                  {SALE.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>

              {/* Orari (select 30') */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Dalle</label>
                  <select className="select h-11" value={dalle} onChange={(e) => setDalle(e.target.value)}>
                    {TIME_OPTS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Alle</label>
                  <select className="select h-11" value={alle} onChange={(e) => setAlle(e.target.value)}>
                    {alleOptions.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Attività */}
              <div>
                <label className="block text-sm text-slate-700 mb-1">Attività</label>
                <input
                  className="input h-11"
                  value={attivita}
                  onChange={(e) => setAttivita(e.target.value)}
                  placeholder="Es. Zumba"
                  required
                />
                {prefs.recent_corsi && prefs.recent_corsi.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {prefs.recent_corsi.map((c) => (
                      <button
                        key={c}
                        className="tag"
                        onClick={() => setAttivita(c)}
                        type="button"
                        title="Usa attività recente"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sostituzione + Note */}
              <div className="flex items-center gap-2">
                <input id="sost" type="checkbox" className="check-lg" checked={sostituzione} onChange={(e) => setSostituzione(e.target.checked)} />
                <label htmlFor="sost" className="text-sm">Sostituzione</label>
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">Note</label>
                <textarea className="input h-24" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>

              {/* Errori */}
              {err && <div className="text-sm text-red-600">{err}</div>}

              {/* Azioni */}
              <div className="flex items-center justify-between">
                <button className="btn btn-ghost" onClick={resetToList}>Logout</button>
                <button className="btn btn-brand" onClick={submit}>Salva</button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="py-6 text-center text-xs text-slate-500">
        © 2025 <span className="font-medium">Progettato da Roberto Tavano</span>
      </footer>
    </div>
  );
}