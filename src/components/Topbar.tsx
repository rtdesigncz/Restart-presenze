"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Topbar() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.rpc("is_admin");
      setIsAdmin(!!data);
    };
    check();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-[1600px] mx-auto px-4 lg:px-6 h-14 flex items-center justify-between">
        <button
          onClick={() => router.push("/")}
          className="text-[var(--brand-ink)] font-bold hover:opacity-90"
          aria-label="Home Presenze"
        >
          Presenze Restart
        </button>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button onClick={() => router.push("/admin")} className="btn btn-ghost text-sm">
              Admin
            </button>
          )}
          <button onClick={logout} className="btn btn-ghost text-sm">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}