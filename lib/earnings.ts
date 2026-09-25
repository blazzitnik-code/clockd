export type EntryStatus = "worked" | "planned";

export interface Company {
  id: string;
  user_id: string;
  name: string;
  gross_rate: number | null; // current rate (mirrors latest company_rates row); null = not hourly
  rates?: CompanyRate[];      // rate history, sorted by valid_from ascending
  rate_type?: RateType;       // whether the rate values are gross or net per hour
}

export type RateType = "gross" | "net";

// A company's gross hourly rate valid from a given date onward.
export interface CompanyRate {
  id: string;
  user_id: string;
  company_id: string;
  gross_rate: number;
  valid_from: string; // YYYY-MM-DD
}

// Sentinel date for "valid from the start" (the first rate of a company).
export const RATE_FROM_START = "2000-01-01";

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
  duration_minutes: number | null; // quick entry: total time without start/end
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
  rate_type?: RateType; // applies to the default rate
}

// Share of gross that remains after social contributions (PIZ + PDO).
export function netFactor(settings: Settings): number {
  return 1 - settings.piz_pct / 100 - settings.pdo_pct / 100;
}

// Convert an hourly rate entered as gross or net into gross.
export function toGross(value: number, type: RateType | undefined, settings: Settings): number {
  return type === "net" ? value / netFactor(settings) : value;
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
  const raw =
    entry.duration_minutes != null
      ? entry.duration_minutes
      : rawMinutes(entry.start_time, entry.end_time);
  const mins = applyRounding(raw, settings.rounding);
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

// A worked entry that counts toward money: finished timer, quick duration, or manual amount.
export function isDone(e: Entry): boolean {
  return (
    e.status === "worked" &&
    (!!e.end_time || e.duration_minutes != null || e.gross_override != null || e.net_override != null)
  );
}

// Gross hourly rate that applied on `date`: the latest company rate whose
// valid_from <= date. Falls back to the company's current rate, then to the
// default rate in Settings.
export function rateFor(company: Company | undefined, date: string, settings: Settings): number {
  const rates = company?.rates;
  if (rates && rates.length) {
    let r = rates[0];
    for (const x of rates) if (x.valid_from <= date) r = x;
    return toGross(Number(r.gross_rate), company?.rate_type, settings);
  }
  if (company?.gross_rate != null) return toGross(company.gross_rate, company.rate_type, settings);
  return toGross(settings.gross_rate, settings.rate_type, settings);
}

export function resolveEntryGross(
  entry: Entry,
  settings: Settings,
  companyMap: Map<string, Company>
): number {
  if (entry.gross_override != null) return entry.gross_override;
  if (entry.net_override != null) {
    // back-calculate: net = gross × (1 − piz% − pdo%)
    return entry.net_override / netFactor(settings);
  }
  const company = entry.company_id ? companyMap.get(entry.company_id) : undefined;
  return entryHours(entry, settings) * rateFor(company, entry.work_date, settings);
}

export function computeBreakdown(
  entries: Entry[],
  settings: Settings,
  companies: Company[] = []
): NetBreakdown {
  const companyMap = new Map(companies.map((c) => [c.id, c]));
  const worked = entries.filter(isDone);

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
