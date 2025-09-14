// src/app/api/admin/create-instructor/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// helper: client "normale" legato ai cookie per capire chi sta chiamando (e verificare admin)
function getClientFromCookies() {
  return createClient(supabaseUrl, anonKey, {
    global: { headers: { "X-Client-Info": "admin-create-instructor" } },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    cookies: {
      get(name) {
        // @ts-ignore
        return cookies().get(name)?.value;
      },
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { p_full_name, p_email, p_password, p_pin } = body as {
      p_full_name: string;
      p_email: string;
      p_password: string;
      p_pin?: string | null;
    };

    // 1) Chi sta chiamando deve essere admin
    const supabase = getClientFromCookies();
    const { data: adminFlag, error: eAdmin } = await supabase.rpc("is_admin");
    if (eAdmin || !adminFlag) {
      return NextResponse.json({ error: "Operazione non consentita (solo amministratori)." }, { status: 403 });
    }

    // 2) Crea l'utente in auth con Service Role
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: p_email,
      password: p_password,
      email_confirm: true, // evita mail di conferma
      user_metadata: {
        full_name: p_full_name,
      },
    });

    if (createErr || !created?.user) {
      return NextResponse.json({ error: createErr?.message || "Creazione utente fallita." }, { status: 400 });
    }

    const newUser = created.user;

    // 3) Aggiorna profilo (ruolo istruttore + full_name)
    const { error: profErr } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: newUser.id,
        full_name: p_full_name,
        ruolo: "istruttore",
      }, { onConflict: "id" });

    if (profErr) {
      return NextResponse.json({ error: `Utente creato, ma profilo non aggiornato: ${profErr.message}` }, { status: 200 });
    }

    // 4) (Opzionale) PIN, se lo usi nel tuo schema (colonna pin_hash + estensione pgcrypto attiva)
    if (p_pin && p_pin.trim()) {
      // aggiorna pin_hash via RPC admin_set_pin se l'hai già definita
      const { error: pinErr } = await supabase.rpc("admin_set_pin", {
        p_user_id: newUser.id,
        p_new_pin: p_pin.trim(),
      });
      if (pinErr) {
        // non blocchiamo l'esito, avvisiamo
        return NextResponse.json({ warning: `Creato, ma PIN non impostato: ${pinErr.message}` }, { status: 200 });
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Errore inatteso." }, { status: 500 });
  }
}