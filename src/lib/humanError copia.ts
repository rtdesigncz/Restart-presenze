// src/lib/humanError.ts
/**
 * Converte errori tecnici Postgres/Supabase in messaggi chiari in italiano.
 * Usa match per substring/codice: è resiliente rispetto a versioni diverse.
 */

type AnyErr = { message?: string; code?: string } | null | undefined;

export function humanError(err: AnyErr): string {
  if (!err) return "Errore sconosciuto.";

  const raw = (err.message || "").toLowerCase();
  const code = (err as any).code || "";

  // --- Autenticazione / permessi
  if (raw.includes("devi effettuare il login") || raw.includes("not authenticated")) {
    return "Devi effettuare il login per continuare.";
  }
  if (raw.includes("solo admin") || raw.includes("questa operazione è riservata agli amministratori")) {
    return "Questa operazione è riservata agli amministratori.";
  }
  if (raw.includes("row-level security") || raw.includes("rls")) {
    return "Operazione non consentita: non puoi inserire o modificare ore in questo periodo.";
  }
  if (code === "PGRST301" || raw.includes("permission denied")) {
    return "Non hai i permessi per eseguire questa operazione.";
  }

  // --- Vincoli di business
  if (raw.includes("l'orario di fine non può essere precedente") || raw.includes("fine <= inizio")) {
    return "Orario non valido: l'orario di fine deve essere successivo a quello di inizio.";
  }
  if (raw.includes("chk_ora_range_valid")) {
    return "Orario non valido: l'orario di fine deve essere successivo a quello di inizio.";
  }
  if (raw.includes("chk_granularita_30min")) {
    return "Gli orari devono essere impostati a intervalli di 30 minuti (es. 10:00, 10:30, 11:00).";
  }
  if (raw.includes("no_overlap_per_user") || raw.includes("overlap") || raw.includes("conflitto di orario")) {
    return "Conflitto: hai già un'ora sovrapposta in questo intervallo.";
  }

  // --- Unicità / duplicati
  if (raw.includes("duplicate key value") || raw.includes("violates unique constraint")) {
    return "Esiste già una registrazione identica (duplicato).";
  }

  // --- Tipi e valori non validi
  if (raw.includes("invalid input value for enum") || raw.includes("invalid input syntax")) {
    return "Valore non valido: controlla i campi inseriti.";
  }
  if (raw.includes("null value in column") || raw.includes("not-null constraint")) {
    return "Manca un campo obbligatorio: completa tutti i campi richiesti.";
  }
  if (raw.includes("value too long")) {
    return "Testo troppo lungo: accorcia il contenuto inserito.";
  }

  // --- Audit / sistemi interni
  if (raw.includes("audit_logs")) {
    return "Errore interno durante la registrazione: riprova o contatta l’amministratore.";
  }

  // --- Fallback
  return "Operazione non consentita o dati non validi.";
}