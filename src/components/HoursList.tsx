// src/components/HoursList.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { humanError } from "@/lib/humanError";
import { useToast } from "@/components/ToastProvider";

type Ora = {
  id: string;
  user_id: string;
  istruttore?: string;
  giorno: string;
  ora_start: string;
  ora_end: string;
  sala: string;
  corso: string; // a DB resta "corso", ma a UI mostriamo "Attività"
  sostituzione: boolean;
  note: string | null;
  status?: "pending" | "approved" | "rejected";
  reject_reason?: string | null;
};

type Props = {
  items: Ora[];
  onRefresh: () => void;
  showInstructor?: boolean;
};

function durationHours(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  return (mins / 60).toFixed(mins % 60 === 0 ? 0 : 1);
}

function StatusBadge({ s }: { s?: string }) {
  const label = s === "approved" ? "Approvata" : s === "rejected" ? "Rifiutata" : "In attesa";
  const cls =
    s === "approved"
      ? "border-emerald-500 text-emerald-700 bg-emerald-50"
      : s === "rejected"
      ? "border-red-500 text-red-700 bg-red-50"
      : "border-amber-500 text-amber-700 bg-amber-50";
  return <span className={`tag ${cls}`}>{label}</span>;
}

export default function HoursList({ items, onRefresh, showInstructor = false }: Props) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [onlyPending, setOnlyPending] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("onlyPending") === "1";
  });
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const toast = useToast();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("is_admin");
      setIsAdmin(!!data);
    })();
  }, []);

  // persisti preferenza filtro
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("onlyPending", onlyPending ? "1" : "0");
    }
  }, [onlyPending]);

  const pendingCount = useMemo(
    () => (items || []).filter((o) => o.status === "pending").length,
    [items]
  );

  const filteredItems = useMemo(() => {
    const base = items || [];
    if (!isAdmin || !onlyPending) return base;
    return base.filter((o) => o.status === "pending");
  }, [items, isAdmin, onlyPending]);

  const allVisibleIds = filteredItems.map((o) => o.id);
  const selectedIds = useMemo(
    () => allVisibleIds.filter((id) => selected[id]),
    [allVisibleIds, selected]
  );
  const allSelected = selectedIds.length > 0 && selectedIds.length === allVisibleIds.length;

  const toggleAll = (checked: boolean) => {
    const next: Record<string, boolean> = {};
    allVisibleIds.forEach((id) => (next[id] = checked));
    setSelected(next);
  };
  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => ({ ...prev, [id]: checked }));
  };

  // azioni singole
  const deleteRow = async (id: string) => {
    const ok = window.confirm("Eliminare questa riga?");
    if (!ok) return;
    const { error } = await supabase.rpc("delete_ora", { p_id: id });
    if (error) toast.push(humanError(error), "error");
    else {
      toast.push("Riga eliminata.", "success");
      onRefresh();
    }
  };
  const approveRow = async (id: string) => {
    const { error } = await supabase.rpc("approve_ora", { p_id: id });
    if (error) toast.push(humanError(error), "error");
    else {
      toast.push("Ora approvata.", "success");
      onRefresh();
    }
  };
  const rejectRow = async (id: string) => {
    const reason = window.prompt("Motivazione (opzionale) per il rifiuto:", "");
    const { error } = await supabase.rpc("reject_ora", { p_id: id, p_reason: reason || null });
    if (error) toast.push(humanError(error), "error");
    else {
      toast.push("Ora rifiutata.", "success");
      onRefresh();
    }
  };

  // azioni bulk
  const approveSelected = async () => {
    if (selectedIds.length === 0) return;
    const { error } = await supabase.rpc("approve_many", { p_ids: selectedIds });
    if (error) toast.push(humanError(error), "error");
    else {
      toast.push(`Approvate ${selectedIds.length} righe.`, "success");
      setSelected({});
      onRefresh();
    }
  };
  const rejectSelected = async () => {
    if (selectedIds.length === 0) return;
    const reason = window.prompt(`Motivazione (opzionale) per rifiutare ${selectedIds.length} righe:`, "");
    const { error } = await supabase.rpc("reject_many", { p_ids: selectedIds, p_reason: reason || null });
    if (error) toast.push(humanError(error), "error");
    else {
      toast.push(`Rifiutate ${selectedIds.length} righe.`, "success");
      setSelected({});
      onRefresh();
    }
  };

  // --- UI ---
  return (
    <div className="card border-slate-200">
      {/* Toolbar SEMPRE visibile (anche su mobile) */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 border-b">
        <div className="flex items-center gap-3">
          {isAdmin && (
            <>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="check-lg"
                  checked={onlyPending}
                  onChange={(e) => setOnlyPending(e.target.checked)}
                />
                Mostra solo in attesa
              </label>
              <span className="text-xs text-slate-500">
                In attesa: <span className="font-medium">{pendingCount}</span>
              </span>
            </>
          )}
        </div>

        {/* Bulk actions (quando c'è selezione) */}
        {isAdmin && selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              className="btn bg-emerald-600 border-emerald-600 text-white hover:opacity-90"
              onClick={approveSelected}
              title="Approva selezionate"
            >
              Approva selezionate ({selectedIds.length})
            </button>
            <button className="btn btn-danger" onClick={rejectSelected} title="Rifiuta selezionate">
              Rifiuta selezionate ({selectedIds.length})
            </button>
          </div>
        )}
      </div>

      {/* MOBILE: card list (md:hidden) */}
      <div className="md:hidden p-3 space-y-3">
        {filteredItems.length === 0 ? (
          <p className="text-sm text-slate-600">
            Nessuna ora {isAdmin && onlyPending ? "in attesa" : "registrata"} in questa data.
          </p>
        ) : (
          filteredItems.map((o) => {
            const isPending = o.status === "pending";
            const sel = !!selected[o.id];
            return (
              <div key={o.id} className="border rounded-lg bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {/* Intestazione: attività + sala */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium truncate">{o.corso}</div>
                      <span className="tag">{o.sala}</span>
                      {showInstructor && (
                        <span className="text-xs text-slate-500 truncate">• {o.istruttore || "—"}</span>
                      )}
                    </div>

                    {/* Orari + durata */}
                    <div className="mt-1 text-sm text-slate-700">
                      <span className="font-medium">
                        {o.ora_start.slice(0, 5)}–{o.ora_end.slice(0, 5)}
                      </span>
                      <span className="text-slate-500"> • {durationHours(o.ora_start, o.ora_end)} h</span>
                      {o.sostituzione && <span className="ml-2 tag">Sostituzione</span>}
                    </div>

                    {/* Note */}
                    {o.note && (
                      <div className="mt-1 text-sm text-slate-700">
                        <span className="text-slate-500">Note: </span>
                        {o.note}
                      </div>
                    )}

                    {/* Stato + motivo rifiuto */}
                    <div className="mt-2">
                      <StatusBadge s={o.status} />
                      {o.status === "rejected" && o.reject_reason && (
                        <div className="text-xs text-red-600 mt-1">{o.reject_reason}</div>
                      )}
                    </div>
                  </div>

                  {/* Selezione (solo admin, solo pending) */}
                  {isAdmin && (
                    <div className="pl-2">
                      <input
                        type="checkbox"
                        className="check-lg mt-1"
                        checked={sel}
                        onChange={(e) => toggleOne(o.id, e.target.checked)}
                        disabled={!isPending}
                        title={isPending ? "Seleziona" : "Solo voci in attesa sono selezionabili"}
                      />
                    </div>
                  )}
                </div>

                {/* Azioni */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {isAdmin && isPending && (
                    <>
                      <button
                        className="btn bg-emerald-600 border-emerald-600 text-white hover:opacity-90 btn-xs"
                        onClick={() => approveRow(o.id)}
                      >
                        Approva
                      </button>
                      <button className="btn btn-danger btn-xs" onClick={() => rejectRow(o.id)}>
                        Rifiuta
                      </button>
                    </>
                  )}
                  <button onClick={() => deleteRow(o.id)} className="btn btn-danger btn-xs">
                    Elimina
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP: tabella (hidden su mobile) */}
      <div className="hidden md:block overflow-x-auto rounded-b-lg">
        {filteredItems.length === 0 ? (
          <div className="p-5">
            <p className="text-sm text-slate-600">
              Nessuna ora {isAdmin && onlyPending ? "in attesa" : "registrata"} in questa data.
            </p>
          </div>
        ) : (
          <table className="table-flat table-compact w-full text-sm">
            <thead>
              <tr>
                {isAdmin && (
                  <th className="th">
                    <input
                      type="checkbox"
                      className="check-lg"
                      checked={allSelected}
                      onChange={(e) => toggleAll(e.target.checked)}
                    />
                  </th>
                )}
                {showInstructor && <th className="th">Istruttore</th>}
                <th className="th">Dalle</th>
                <th className="th">Alle</th>
                <th className="th">Durata</th>
                <th className="th">Sala</th>
                <th className="th">Attività</th>
                <th className="th">Sost.</th>
                <th className="th">Note</th>
                <th className="th">Stato</th>
                <th className="th">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((o) => {
                const isPending = o.status === "pending";
                const sel = !!selected[o.id];
                return (
                  <tr key={o.id} className="border-t">
                    {isAdmin && (
                      <td className="td">
                        <input
                          type="checkbox"
                          className="check-lg"
                          checked={sel}
                          onChange={(e) => toggleOne(o.id, e.target.checked)}
                          disabled={!isPending}
                          title={isPending ? "Seleziona" : "Solo voci in attesa sono selezionabili"}
                        />
                      </td>
                    )}
                    {showInstructor && <td className="td whitespace-nowrap">{o.istruttore || "—"}</td>}
                    <td className="td whitespace-nowrap">{o.ora_start.slice(0, 5)}</td>
                    <td className="td whitespace-nowrap">{o.ora_end.slice(0, 5)}</td>
                    <td className="td">{durationHours(o.ora_start, o.ora_end)} h</td>
                    <td className="td">{o.sala}</td>
                    <td className="td max-w-[280px]">
                      <span className="block truncate" title={o.corso}>{o.corso}</span>
                    </td>
                    <td className="td">{o.sostituzione ? "✓" : ""}</td>
                    <td className="td">{o.note || ""}</td>
                    <td className="td">
                      <div className="flex flex-col gap-1">
                        <StatusBadge s={o.status} />
                        {o.status === "rejected" && o.reject_reason && (
                          <div className="text-xs text-red-600 max-w-[240px]">{o.reject_reason}</div>
                        )}
                      </div>
                    </td>
                    <td className="td">
                      <div className="flex flex-wrap gap-2">
                        {isAdmin && isPending && (
                          <>
                            <button
                              className="btn bg-emerald-600 border-emerald-600 text-white hover:opacity-90 btn-xs"
                              onClick={() => approveRow(o.id)}
                            >
                              Approva
                            </button>
                            <button className="btn btn-danger btn-xs" onClick={() => rejectRow(o.id)}>
                              Rifiuta
                            </button>
                          </>
                        )}
                        <button onClick={() => deleteRow(o.id)} className="btn btn-danger btn-xs">
                          Elimina
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}