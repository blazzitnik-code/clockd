// Core domain logic: hours, rounding, and the Slovenian student-work
// gross→net→akontacija calculation. Mirrors the monthly breakdown card.

export type EntryStatus = "worked" | "planned";

export interface Entry {
  id: string;
  user_id: string;
  work_date: string; // YYYY-MM-DD (date of START time)
  start_time: string; // HH:MM or HH:MM:SS
  end_time: string | null; // null while running
  crosses_midnight: boolean;
  label: string | null;
  status: EntryStatus;
}

export interface Settings {
  gross_rate: number;
  rounding: "none" | "15" | "30";
  piz_pct: number;
  pdo_pct: number;
  akontacija_pct: number;
  akontacija_threshold: number;
  annual_allowance: number;
  locale: "en" | "sl";
}

// --- time helpers -------------------------------------------------

// minutes since midnight from "HH:MM" or "HH:MM:SS"
function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// Raw worked minutes for one entry. Handles overnight: if end < start,
// the shift crossed midnight, so add a full day.
export function rawMinutes(start: string, end: string | null): number {
  if (!end) return 0; // running session contributes nothing until ended
  let diff = toMinutes(end) - toMinutes(start);
  if (diff < 0) diff += 24 * 60; // crossed midnight
  return diff;
}

// Apply the rounding mode to a minute count.
export function applyRounding(
  minutes: number,
  mode: Settings["rounding"]
): number {
  if (mode === "none") return minutes;
  const step = mode === "15" ? 15 : 30;
  return Math.round(minutes / step) * step;
}

// Worked hours (decimal) for an entry, after rounding.
export function entryHours(entry: Entry, settings: Settings): number {
  const mins = applyRounding(
    rawMinutes(entry.start_time, entry.end_time),
    settings.rounding
  );
  return mins / 60;
}

// --- earnings -----------------------------------------------------

export interface NetBreakdown {
  hours: number;
  gross: number;
  piz: number;
  pdo: number;
  netBeforeTax: number; // "Neto pred dohodnino" — used for day/week
  akontacija: number; // 0 if gross <= threshold
  netAfterTax: number; // "Neto po akontaciji" — month worst-case take-home
  akontacijaApplies: boolean;
}

// Given a set of WORKED entries, compute the full breakdown.
// Planned entries are excluded from money everywhere.
export function computeBreakdown(
  entries: Entry[],
  settings: Settings
): NetBreakdown {
  const worked = entries.filter((e) => e.status === "worked" && e.end_time);

  const hours = worked.reduce((sum, e) => sum + entryHours(e, settings), 0);
  const gross = hours * settings.gross_rate;

  const piz = gross * (settings.piz_pct / 100);
  const pdo = gross * (settings.pdo_pct / 100);
  const netBeforeTax = gross - piz - pdo;

  const akontacijaApplies = gross > settings.akontacija_threshold;
  const akontacija = akontacijaApplies
    ? gross * (settings.akontacija_pct / 100)
    : 0;
  const netAfterTax = netBeforeTax - akontacija;

  return {
    hours,
    gross,
    piz,
    pdo,
    netBeforeTax,
    akontacija,
    netAfterTax,
    akontacijaApplies,
  };
}

// Net shown on day/week views = net before income-tax advance.
export function netBeforeTax(entries: Entry[], settings: Settings): number {
  return computeBreakdown(entries, settings).netBeforeTax;
}

// --- formatting ---------------------------------------------------

export function eur(n: number, locale: "en" | "sl" = "en"): string {
  return new Intl.NumberFormat(locale === "sl" ? "sl-SI" : "en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

export function fmtHours(h: number): string {
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  if (hh === 0) return `${mm}m`;
  return mm === 0 ? `${hh}h` : `${hh}h ${mm}m`;
}
