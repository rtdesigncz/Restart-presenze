// src/app/api/admin/set-pin/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

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

    // Check admin
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("ruolo")
      .eq("id", uid)
      .single();

    if (!prof || prof.ruolo !== "admin") {
      return NextResponse.json({ error: "Operazione non consentita (solo amministratori)." }, { status: 403 });
    }

    const { p_user_id, p_new_pin } = (await req.json()) as { p_user_id: string; p_new_pin: string };
    if (!p_user_id || !p_new_pin) {
      return NextResponse.json({ error: "Parametri mancanti." }, { status: 400 });
    }

    const pin = p_new_pin.trim();
    if (!/^\d{4,6}$/.test(pin)) {
      return NextResponse.json({ error: "PIN non valido: usare 4-6 cifre." }, { status: 400 });
    }

    const hash = await bcrypt.hash(pin, 10);
    const { error: upErr } = await supabaseAdmin
      .from("profiles")
      .update({ pin_hash: hash })
      .eq("id", p_user_id);

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Errore inatteso." }, { status: 500 });
  }
}