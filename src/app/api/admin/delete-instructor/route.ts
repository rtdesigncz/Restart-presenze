// src/app/api/admin/delete-instructor/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userRes } = await userClient.auth.getUser();
    const uid = userRes?.user?.id;
    if (!uid) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

    // Check admin su profiles (service role)
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("ruolo")
      .eq("id", uid)
      .single();

    if (!prof || prof.ruolo !== "admin") {
      return NextResponse.json({ error: "Operazione non consentita (solo amministratori)." }, { status: 403 });
    }

    const { p_user_id } = (await req.json()) as { p_user_id: string };
    if (!p_user_id) return NextResponse.json({ error: "p_user_id mancante." }, { status: 400 });

    // Elimina dati collegati
    await supabaseAdmin.from("ore").delete().eq("user_id", p_user_id);
    await supabaseAdmin.from("profiles").delete().eq("id", p_user_id);
    // Elimina utente auth
    await supabaseAdmin.auth.admin.deleteUser(p_user_id);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Errore inatteso." }, { status: 500 });
  }
}