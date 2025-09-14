// src/app/api/admin/create-instructor/route.ts
import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: Request) {
  try {
    // === 1) Prendi il JWT dal header Authorization ===
    const auth = req.headers.get("authorization") || req.headers.get("Authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;
    if (!token) {
      return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
    }

    // Client service-role
    const svc = createServiceClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // === 2) Risali all'utente dal token e verifica che sia admin ===
    const { data: who, error: whoErr } = await svc.auth.getUser(token);
    if (whoErr || !who?.user?.id) {
      return NextResponse.json({ error: "Sessione non valida." }, { status: 401 });
    }
    const callerId = who.user.id;

    // check admin via DB (service role bypassa RLS)
    const { data: adminCheck, error: adminErr } = await svc
      .from("profiles")
      .select("id")
      .eq("id", callerId)
      .eq("role", "admin")
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    if (adminErr) {
      return NextResponse.json({ error: adminErr.message }, { status: 403 });
    }
    if (!adminCheck?.id) {
      return NextResponse.json({ error: "Operazione riservata agli amministratori." }, { status: 403 });
    }

    // === 3) Dati in ingresso ===
    const body = await req.json();
    const {
      full_name,
      email,
      password,
      role = "istruttore", // <-- default corretto per il tuo enum
      is_active = true,
      pin, // opzionale
    } = body || {};
    if (!full_name || !email || !password) {
      return NextResponse.json({ error: "Dati mancanti (nome, email, password)." }, { status: 400 });
    }

    // Normalizza ruolo: qualunque cosa non sia 'admin' diventa 'istruttore'
    const roleValue = role === "admin" ? "admin" : "istruttore";

    // === 4) Crea user Auth (email confermata) ===
    const { data: created, error: createErr } = await svc.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (createErr) {
      return NextResponse.json({ error: createErr.message }, { status: 400 });
    }
    const newUser = created.user;
    if (!newUser) {
      return NextResponse.json({ error: "Creazione utente fallita." }, { status: 400 });
    }

    // === 5) Upsert profilo ===
    const { error: profErr } = await svc
      .from("profiles")
      .upsert(
        {
          id: newUser.id,
          full_name,
          role: roleValue as any, // ruolo_enum: 'admin' | 'istruttore'
          is_active: !!is_active,
          deleted_at: null,
        },
        { onConflict: "id" }
      );
    if (profErr) {
      // rollback auth se profilo fallisce
      await svc.auth.admin.deleteUser(newUser.id);
      return NextResponse.json({ error: profErr.message }, { status: 400 });
    }

    // === 6) Imposta PIN se fornito (min 4 cifre) ===
    if (pin && String(pin).trim().length >= 4) {
      const { error: pinErr } = await svc.rpc("admin_set_pin", {
        p_user: newUser.id,
        p_pin: String(pin).trim(),
      });
      if (pinErr) {
        return NextResponse.json(
          { warning: "Utente creato, ma PIN non impostato: " + pinErr.message, user_id: newUser.id },
          { status: 201 }
        );
      }
    }

    return NextResponse.json({ ok: true, user_id: newUser.id }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Errore inatteso." }, { status: 500 });
  }
}