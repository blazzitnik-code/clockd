export type EntryStatus = "worked" | "planned";

export interface Company {
  id: string;
  user_id: string;
  name: string;
  gross_rate: number | null; // null = not hourly-based (e.g. Wolt deliveries)
}

export interface Entry {
  id: string;
  user_id: string;
  work_date: string;
  start_time: string | null; // null for manual-amount entries
  end_time: string | null;
  crosses_midnight: boolean;
  label: string | null;
  status: EntryStatus;
  company_id: string | null;
  gross_override: number | null;
  net_override: number | null;
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

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function rawMinutes(start: string | null, end: string | null): number {
  if (!start || !end) return 0;
  let diff = toMinutes(end) - toMinutes(start);
  if (diff < 0) diff += 24 * 60;
  return diff;
}

export function applyRounding(
  minutes: number,
  mode: Settings["rounding"]
): number {
  if (mode === "none") return minutes;
  const step = mode === "15" ? 15 : 30;
  return Math.round(minutes / step) * step;
}

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
  netBeforeTax: number;
  akontacija: number;
  netAfterTax: number;
  akontacijaApplies: boolean;
}

function resolveEntryGross(
  entry: Entry,
  settings: Settings,
  companyMap: Map<string, Company>
): number {
  if (entry.gross_override != null) return entry.gross_override;
  if (entry.net_override != null) {
    // back-calculate: net = gross × (1 − piz% − pdo%)
    const factor = 1 - settings.piz_pct / 100 - settings.pdo_pct / 100;
    return entry.net_override / factor;
  }
  const rate =
    (entry.company_id ? companyMap.get(entry.company_id)?.gross_rate : null) ??
    settings.gross_rate;
  return entryHours(entry, settings) * rate;
}

export function computeBreakdown(
  entries: Entry[],
  settings: Settings,
  companies: Company[] = []
): NetBreakdown {
  const companyMap = new Map(companies.map((c) => [c.id, c]));
  const worked = entries.filter(
    (e) =>
      e.status === "worked" &&
      (e.end_time || e.gross_override != null || e.net_override != null)
  );

  const hours = worked.reduce((sum, e) => sum + entryHours(e, settings), 0);
  const gross = worked.reduce(
    (sum, e) => sum + resolveEntryGross(e, settings, companyMap),
    0
  );

  const piz = gross * (settings.piz_pct / 100);
  const pdo = gross * (settings.pdo_pct / 100);
  const netBeforeTax = gross - piz - pdo;

  const akontacijaApplies = gross > settings.akontacija_threshold;
  const akontacija = akontacijaApplies
    ? gross * (settings.akontacija_pct / 100)
    : 0;
  const netAfterTax = netBeforeTax - akontacija;

  return { hours, gross, piz, pdo, netBeforeTax, akontacija, netAfterTax, akontacijaApplies };
}

export function netBeforeTax(
  entries: Entry[],
  settings: Settings,
  companies: Company[] = []
): number {
  return computeBreakdown(entries, settings, companies).netBeforeTax;
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
