// src/app/api/admin/create-instructor/route.ts
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

    const { data: userRes, error: gErr } = await userClient.auth.getUser();
    if (gErr || !userRes?.user) {
      return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
    }
    const uid = userRes.user.id;

    // Controllo admin su profiles con service role
    const { data: prof, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("ruolo")
      .eq("id", uid)
      .single();
    if (profErr || !prof || prof.ruolo !== "admin") {
      return NextResponse.json({ error: "Operazione non consentita (solo amministratori)." }, { status: 403 });
    }

    const body = await req.json();
    const { p_full_name, p_email, p_password, p_pin } = body as {
      p_full_name: string;
      p_email: string;
      p_password: string;
      p_pin?: string | null;
    };

    // Crea utente in auth
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: p_email,
      password: p_password,
      email_confirm: true,
      user_metadata: { full_name: p_full_name },
    });
    if (createErr || !created?.user) {
      return NextResponse.json({ error: createErr?.message || "Creazione utente fallita." }, { status: 400 });
    }
    const newUser = created.user;

    // Upsert profilo
    const { error: upErr } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: newUser.id, full_name: p_full_name, ruolo: "istruttore" }, { onConflict: "id" });
    if (upErr) {
      return NextResponse.json({ error: `Utente creato, profilo non aggiornato: ${upErr.message}` }, { status: 200 });
    }

    // PIN opzionale via RPC (se configurata)
    if (p_pin && p_pin.trim()) {
      const { error: pinErr } = await userClient.rpc("admin_set_pin", {
        p_user_id: newUser.id,
        p_new_pin: p_pin.trim(),
      });
      if (pinErr) {
        return NextResponse.json({ warning: `Creato, ma PIN non impostato: ${pinErr.message}` }, { status: 200 });
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Errore inatteso." }, { status: 500 });
  }
}