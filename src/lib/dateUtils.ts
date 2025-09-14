export function todayRomeISO(): string {
  const now = new Date();
  // Ottieni la mezzanotte locale
  const local = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  return local.toISOString().slice(0, 10);
}