export function makeId(prefix = "id"): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${t}_${r}`;
}

export function shortAddr(a?: string): string {
  if (!a) return "—";
  return a.length > 10 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

export function fmtTime(ts?: number): string {
  if (!ts) return "—";
  try { return new Date(ts).toISOString().replace("T", " ").slice(0, 16); }
  catch { return String(ts); }
}
