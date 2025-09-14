// src/app/admin/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppShell from "@/components/AppShell";
import ExportCSVButton from "@/components/ExportCSVButton";

type ReportRow = {
  istruttore: string;
  sala: string | null;     // verrà ignorata/forzata a null nel rendering/export
  totale_ore: number;      // ore in decimale
};

type PeriodoBlocco = {
  id: string;
  period_start: string;
  period_end: string;
  created_at: string;
};

type Istruttore = {
  id: string;
  full_name: string;
  email: string;
};

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}
function parseDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m - 1), d);
}

/** Collassa le righe per ISTRTUTTORE (sommando le ore) e ignora Sala */
function collapseByInstructor(rows: ReportRow[]): ReportRow[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = r.istruttore || "(Senza nome)";
    map.set(key, (map.get(key) || 0) + Number(r.totale_ore || 0));
  }
  return Array.from(map.entries())
    .map(([istruttore, totale]) => ({
      istruttore,
      sala: null,                // così restiamo compatibili con l'export component
      totale_ore: Number(totale),
    }))
    .sort((a, b) => a.istruttore.localeCompare(b.istruttore, "it"));
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  const [istruttori, setIstruttori] = useState<Istruttore[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const [periodi, setPeriodi] = useState<PeriodoBlocco[]>([]);

  const [rpcError, setRpcError] = useState<string | null>(null);
  const [weekly, setWeekly] = useState<ReportRow[]>([]);
  const [monthly, setMonthly] = useState<ReportRow[]>([]);
  const [yearly, setYearly] = useState<ReportRow[]>([]);

  const now = useMemo(() => new Date(), []);
  const defaultWeekStart = useMemo(() => {
    const d = new Date(now);
    const day = d.getDay() === 0 ? 7 : d.getDay();
    d.setDate(d.getDate() - (day - 1));
    return d;
  }, [now]);
  const defaultWeekEnd = useMemo(() => {
    const d = new Date(defaultWeekStart);
    d.setDate(d.getDate() + 6);
    return d;
  }, [defaultWeekStart]);
  const defaultMonthStart = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1), [now]);
  const defaultMonthEnd = useMemo(() => new Date(now.getFullYear(), now.getMonth() + 1, 0), [now]);
  const defaultYearStart = useMemo(() => new Date(now.getFullYear(), 0, 1), [now]);
  const defaultYearEnd = useMemo(() => new Date(now.getFullYear(), 11, 31), [now]);

  const [wStart, setWStart] = useState<string>(fmt(defaultWeekStart));
  const [wEnd, setWEnd] = useState<string>(fmt(defaultWeekEnd));
  const [mStart, setMStart] = useState<string>(fmt(defaultMonthStart));
  const [mEnd, setMEnd] = useState<string>(fmt(defaultMonthEnd));
  const [yStart, setYStart] = useState<string>(fmt(defaultYearStart));
  const [yEnd, setYEnd] = useState<string>(fmt(defaultYearEnd));

  const [closing, setClosing] = useState(false);
  const [closeMsg, setCloseMsg] = useState<string | null>(null);
  const [unlockMsg, setUnlockMsg] = useState<string | null>(null);
  const [uStart, setUStart] = useState<string>(fmt(defaultMonthStart));
  const [uEnd, setUEnd] = useState<string>(fmt(defaultMonthEnd));
  const meseCorrenteLabel = useMemo(
    () => now.toLocaleDateString("it-IT", { month: "long", year: "numeric" }),
    [now]
  );

  useEffect(() => {
    const check = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAllowed(false);
        setLoading(false);
        router.push("/login");
        return;
      }
      const { data, error } = await supabase.rpc("is_admin");
      if (error || !data) {
        setAllowed(false);
        setLoading(false);
        router.push("/");
        return;
      }
      setAllowed(true);
      setLoading(false);
    };
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadIstruttori = async () => {
    const { data, error } = await supabase.rpc("list_istruttori");
    if (!error && data) setIstruttori(data as Istruttore[]);
  };
  const loadPeriodi = async () => {
    const { data, error } = await supabase
      .from("periodi_blocco")
      .select("id, period_start, period_end, created_at")
      .order("period_start", { ascending: false });
    if (!error && data) setPeriodi(data as PeriodoBlocco[]);
  };

  useEffect(() => {
    if (!allowed) return;
    loadIstruttori();
    loadPeriodi();
  }, [allowed]);

  const loadReports = async () => {
    if (!allowed) return;
    setRpcError(null);
    const user = selectedUserId || null;

    const [w, m, y] = await Promise.all([
      supabase.rpc("report_range_filtered", { p_start: wStart, p_end: wEnd, p_user: user }),
      supabase.rpc("report_range_filtered", { p_start: mStart, p_end: mEnd, p_user: user }),
      supabase.rpc("report_range_filtered", { p_start: yStart, p_end: yEnd, p_user: user }),
    ]);

    if (w.error || m.error || y.error) {
      setRpcError(
        w.error?.message || m.error?.message || y.error?.message || "Errore RPC report_range_filtered"
      );
    }

    setWeekly((w.data as ReportRow[]) || []);
    setMonthly((m.data as ReportRow[]) || []);
    setYearly((y.data as ReportRow[]) || []);
  };

  useEffect(() => {
    if (!allowed) return;
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  const handleChiudiMeseCorrente = async () => {
    setCloseMsg(null);
    setClosing(true);
    try {
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      const { error } = await supabase.rpc("chiudi_mese", { p_year: y, p_month: m });
      if (error) setCloseMsg(`Errore: ${error.message}`);
      else {
        setCloseMsg("✅ Mese chiuso correttamente.");
        await loadPeriodi();
      }
    } catch (e: any) {
      setCloseMsg(`Errore inatteso: ${e?.message || e}`);
    } finally {
      setClosing(false);
    }
  };

  const handleUnlock = async () => {
    setUnlockMsg(null);
    try {
      if (!uStart || !uEnd) {
        setUnlockMsg("Seleziona inizio e fine periodo.");
        return;
      }
      if (parseDate(uEnd) < parseDate(uStart)) {
        setUnlockMsg("La data di fine non può essere precedente all'inizio.");
        return;
      }
      const { error } = await supabase.rpc("unlock_period", { p_start: uStart, p_end: uEnd });
      if (error) setUnlockMsg(`Errore: ${error.message}`);
      else {
        setUnlockMsg("✅ Periodo sbloccato.");
        await loadPeriodi();
      }
    } catch (e: any) {
      setUnlockMsg(`Errore inatteso: ${e?.message || e}`);
    }
  };

  /** Tabelle collassate per istruttore (senza Sala) */
  const weeklyCollapsed = useMemo(() => collapseByInstructor(weekly), [weekly]);
  const monthlyCollapsed = useMemo(() => collapseByInstructor(monthly), [monthly]);
  const yearlyCollapsed  = useMemo(() => collapseByInstructor(yearly),  [yearly]);

  /** Render tabella senza colonna Sala */
  const renderTable = (rows: ReportRow[]) => (
    <div className="overflow-x-auto border rounded-lg bg-white">
      <table className="table-flat w-full text-sm">
        <thead>
          <tr>
            <th className="th">Istruttore</th>
            <th className="th">Totale ore</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td className="td" colSpan={2}>Nessun dato nel periodo selezionato.</td></tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i}>
                <td className="td">{r.istruttore}</td>
                <td className="td">{Number(r.totale_ore).toFixed(2)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  if (loading) {
    return (
      <AppShell>
        <div className="text-sm text-slate-600">Caricamento…</div>
      </AppShell>
    );
  }
  if (!allowed) {
    return (
      <AppShell>
        <div className="text-sm text-slate-600">Reindirizzamento…</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="text-xl font-semibold mb-4">Dashboard Admin</h1>

      {/* Filtro istruttore */}
      <section className="mb-6 bg-white border rounded-lg p-4">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="md:w-80">
            <label className="block text-sm text-slate-700 mb-1">Istruttore</label>
            <select
              className="select"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">Tutti</option>
              {istruttori.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.full_name}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-brand md:ml-auto" onClick={loadReports}>
            Applica filtro
          </button>
        </div>
      </section>

      {/* Settimanale */}
      <section className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 mb-2">
          <h2 className="text-lg font-semibold">Report Settimanale</h2>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="block text-xs text-slate-700 mb-1">Inizio</label>
              <input type="date" className="input" value={wStart} onChange={(e) => setWStart(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-slate-700 mb-1">Fine</label>
              <input type="date" className="input" value={wEnd} onChange={(e) => setWEnd(e.target.value)} />
            </div>
            <button className="btn btn-ghost" onClick={loadReports}>Aggiorna</button>
            {/* Export usa dati collassati (sala nulla) */}
            <ExportCSVButton filename="report_settimanale.csv" rows={weeklyCollapsed} />
          </div>
        </div>
        {renderTable(weeklyCollapsed)}
      </section>

      {/* Mensile */}
      <section className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 mb-2">
          <h2 className="text-lg font-semibold">Report Mensile</h2>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="block text-xs text-slate-700 mb-1">Inizio</label>
              <input type="date" className="input" value={mStart} onChange={(e) => setMStart(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-slate-700 mb-1">Fine</label>
              <input type="date" className="input" value={mEnd} onChange={(e) => setMEnd(e.target.value)} />
            </div>
            <button className="btn btn-ghost" onClick={loadReports}>Aggiorna</button>
            <ExportCSVButton filename="report_mensile.csv" rows={monthlyCollapsed} />
          </div>
        </div>
        {renderTable(monthlyCollapsed)}
      </section>

      {/* Annuale */}
      <section className="mb-10">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 mb-2">
          <h2 className="text-lg font-semibold">Report Annuale</h2>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="block text-xs text-slate-700 mb-1">Inizio</label>
              <input type="date" className="input" value={yStart} onChange={(e) => setYStart(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-slate-700 mb-1">Fine</label>
              <input type="date" className="input" value={yEnd} onChange={(e) => setYEnd(e.target.value)} />
            </div>
            <button className="btn btn-ghost" onClick={loadReports}>Aggiorna</button>
            <ExportCSVButton filename="report_annuale.csv" rows={yearlyCollapsed} />
          </div>
        </div>
        {renderTable(yearlyCollapsed)}
      </section>

      {/* Chiusura mese */}
      <section className="mb-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Chiusura mese</h2>
              <p className="text-sm text-slate-600">
                Blocca le modifiche alle ore del mese corrente per tutti gli istruttori.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleChiudiMeseCorrente}
                className="btn btn-brand"
                disabled={closing}
              >
                {closing ? "Chiusura in corso…" : `Chiudi ${meseCorrenteLabel}`}
              </button>
            </div>
          </div>
          {closeMsg && (
            <div className={`mt-3 text-sm ${closeMsg.startsWith("✅") ? "text-green-700" : "text-red-600"}`}>
              {closeMsg}
            </div>
          )}
        </div>
      </section>

      {/* Sblocco emergenza */}
      <section className="mb-10">
        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Sblocco di emergenza</h2>
          <p className="text-sm text-slate-600 mb-3">
            Rimuove il lock sulle ore e cancella eventuali periodi di blocco che si sovrappongono all'intervallo.
          </p>
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div>
              <label className="block text-xs text-slate-700 mb-1">Inizio</label>
              <input type="date" className="input" value={uStart} onChange={(e) => setUStart(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-slate-700 mb-1">Fine</label>
              <input type="date" className="input" value={uEnd} onChange={(e) => setUEnd(e.target.value)} />
            </div>
            <button className="btn btn-danger" onClick={handleUnlock}>Sblocca periodo</button>
          </div>
          {unlockMsg && (
            <div className={`mt-3 text-sm ${unlockMsg.startsWith("✅") ? "text-green-700" : "text-red-600"}`}>
              {unlockMsg}
            </div>
          )}
        </div>
      </section>

      {/* Periodi chiusi */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Mesi/periodi chiusi</h2>
        <div className="overflow-x-auto border rounded-lg bg-white">
          <table className="table-flat w-full text-sm">
            <thead>
              <tr>
                <th className="th">Periodo</th>
                <th className="th">Creato il</th>
              </tr>
            </thead>
            <tbody>
              {periodi.length === 0 ? (
                <tr><td className="td" colSpan={2}>Nessun periodo chiuso finora.</td></tr>
              ) : (
                periodi.map((p) => (
                  <tr key={p.id}>
                    <td className="td">
                      {new Date(p.period_start).toLocaleDateString("it-IT")} →{" "}
                      {new Date(p.period_end).toLocaleDateString("it-IT")}
                    </td>
                    <td className="td">
                      {new Date(p.created_at).toLocaleString("it-IT")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}