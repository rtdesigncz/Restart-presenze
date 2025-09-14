// src/components/AppShell.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/** Ritorna YYYY-MM-DD calcolato sulla mezzanotte locale (Europe/Rome sul tuo device). */
export function todayRomeISO(): string {
  const now = new Date();
  const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return localMidnight.toISOString().slice(0, 10);
}

/** Calcola i millisecondi che mancano alla prossima mezzanotte locale. */
function msUntilNextLocalMidnight(): number {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return Math.max(250, next.getTime() - now.getTime());
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [fullName, setFullName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Timer per auto-reset a mezzanotte (reload soft della pagina)
  const midnightTimer = useRef<number | null>(null);

  useEffect(() => {
    // espone opzionalmente in window per altri componenti legacy
    (window as any).__todayRomeISO = todayRomeISO;

    // imposta/riimposta il timer verso la prossima mezzanotte locale
    const setup = () => {
      if (midnightTimer.current) {
        window.clearTimeout(midnightTimer.current);
        midnightTimer.current = null;
      }
      midnightTimer.current = window.setTimeout(() => {
        // Ricarico per forzare il giorno corrente ovunque
        window.location.reload();
      }, msUntilNextLocalMidnight());
    };

    setup();
    return () => {
      if (midnightTimer.current) window.clearTimeout(midnightTimer.current);
    };
  }, []);

  useEffect(() => {
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;
      if (uid) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", uid)
          .single();
        setFullName((prof as any)?.full_name || null);
        const { data: adminFlag } = await supabase.rpc("is_admin");
        setIsAdmin(!!adminFlag);
      } else {
        setFullName(null);
        setIsAdmin(false);
      }
    })();
  }, [pathname]);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/logo-restart.png"
              alt="Restart"
              width={180}
              height={180}
              className="rounded"
              priority
            />
            <div>
              <div className="text-xl font-semibold leading-tight">Presenze</div>
              <div className="text-xs text-slate-500">Restart Fitness Club</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Riepilogo (home) */}
            <Link href="/" className="btn btn-ghost">Riepilogo</Link>

            {isAdmin && (
              <>
                <Link href="/admin" className="btn btn-ghost">Admin</Link>
                <Link href="/settings" className="btn btn-ghost">Impostazioni</Link>
                <Link href="/kiosk" className="btn btn-brand">Tablet</Link>
              </>
            )}

            {fullName && (
              <div className="hidden sm:flex items-center gap-2 text-sm text-slate-700 mr-2">
                Ciao, <span className="font-medium">{fullName}</span>
              </div>
            )}

            {/* Logout con bordino rosso leggero */}
            <button
              className="btn bg-white border-red-200 text-red-700 hover:bg-red-50"
              onClick={logout}
              title="Esci"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main con container/padding globale */}
      <main className="flex-1">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-6">
          {children}
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-slate-500">
        © 2025 <span className="font-medium">Progettato da Roberto Tavano</span>
      </footer>
    </div>
  );
}