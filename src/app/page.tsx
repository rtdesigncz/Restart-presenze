// src/app/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AppShell from "@/components/AppShell";
import HoursList from "@/components/HoursList";
import AddHourModal from "@/components/AddHourModal";
import { todayRomeISO } from "@/lib/dateUtils";

type OraBase = {
  id: string;
  user_id: string;
  giorno: string;
  ora_start: string;
  ora_end: string;
  sala: string;
  corso: string;
  sostituzione: boolean;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  reject_reason: string | null;
};

type OraWithName = OraBase & { istruttore?: string };

function addDaysISO(iso: string, delta: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + delta);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function fmtHuman(itISO: string) {
  const [y, m, d] = itISO.split("-").map(Number);
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

export default function TodayPage() {
  // OGGI calcolato in fuso locale (Europe/Rome)
  const todayISO = useMemo(() => todayRomeISO(), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayISO);
  const [items, setItems] = useState<OraWithName[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const boot = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id ?? null;
      setMyUserId(uid);
      const { data: adminFlag } = await supabase.rpc("is_admin");
      setIsAdmin(!!adminFlag);
    };
    boot();
  }, []);

  const loadData = async (iso: string) => {
    if (!myUserId && !isAdmin) return;

    let q = supabase
      .from("ore")
      .select("id, user_id, giorno, ora_start, ora_end, sala, corso, sostituzione, note, status, reject_reason")
      .eq("giorno", iso)
      .order("ora_start", { ascending: true });

    if (!isAdmin && myUserId) {
      q = q.eq("user_id", myUserId);
    }

    const { data: ore, error } = await q;
    if (error || !ore) {
      setItems([]);
      return;
    }

    if (!isAdmin) {
      setItems(ore as OraWithName[]);
      return;
    }

    const userIds = Array.from(new Set((ore as OraBase[]).map((o) => o.user_id)));
    if (userIds.length === 0) {
      setItems([]);
      return;
    }

    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    const nameMap = new Map<string, string>();
    (profs as { id: string; full_name: string | null }[] | null)?.forEach((p) => {
      if (p.full_name) nameMap.set(p.id, p.full_name);
    });

    const withNames = (ore as OraBase[]).map((o) => ({
      ...o,
      istruttore: nameMap.get(o.user_id) || o.user_id.slice(0, 8),
    }));

    setItems(withNames);
  };

  useEffect(() => {
    if (isAdmin || myUserId) loadData(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, isAdmin, myUserId]);

  const openDatePicker = () => {
    const el = dateInputRef.current;
    if (!el) return;
    // @ts-ignore
    if (el.showPicker) el.showPicker();
    else el.click();
  };

  const goPrev = () => setSelectedDate((d) => addDaysISO(d, -1));
  const goNext = () => setSelectedDate((d) => addDaysISO(d, +1));
  const goToday = () => setSelectedDate(todayRomeISO());

  const isToday = selectedDate === todayISO;

  return (
    <AppShell>
      <section className="mb-8">
        <div className="flex flex-col items-center text-center gap-4">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.01em]">
            Presenze del giorno
          </h1>

          <div className="flex items-center gap-2">
            <button className="btn btn-ghost" onClick={goPrev} aria-label="Giorno precedente">←</button>
            <button type="button" onClick={openDatePicker} className="tag text-base sm:text-lg px-3 py-2" aria-label="Seleziona data" title="Seleziona data">
              {fmtHuman(selectedDate)}
            </button>
            <button className="btn btn-ghost" onClick={goNext} aria-label="Giorno successivo">→</button>

            <input
              ref={dateInputRef}
              type="date"
              className="sr-only"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          {!isToday && (
            <div>
              <button className="btn btn-ghost" onClick={goToday}>
                Torna ad oggi
              </button>
            </div>
          )}

          <div className="mt-1">
            <button onClick={() => setShowModal(true)} className="btn btn-brand">
              + Aggiungi ora
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <HoursList
          items={items}
          onRefresh={() => loadData(selectedDate)}
          showInstructor={isAdmin}
        />
      </section>

      <AddHourModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onAdded={() => loadData(selectedDate)}
        giornoISO={selectedDate}
      />
    </AppShell>
  );
}