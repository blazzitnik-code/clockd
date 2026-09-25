"use client";

import { useState } from "react";
import { Company, Entry, Settings, NetBreakdown, computeBreakdown, eur, fmtHours } from "@/lib/earnings";
import { companyColor } from "@/lib/colors";
import { Locale, tr } from "@/lib/i18n";
import { monthRange, addMonths, format } from "@/lib/dates";

interface Props {
  entries: Entry[];
  settings: Settings;
  companies: Company[];
}

export default function EarningsScreen({ entries, settings, companies }: Props) {
  const locale = settings.locale as Locale;
  const L = (k: Parameters<typeof tr>[0]) => tr(k, locale);
  const [ref, setRef] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<"month" | "year">("month");

  const inRange = (start: Date, end: Date) =>
    entries.filter((e) => {
      const d = new Date(e.work_date + "T00:00:00");
      return d >= start && d <= end;
    });

  const { start: ms, end: me } = monthRange(ref);
  const monthEntries = inRange(ms, me);
  const monthB = computeBreakdown(monthEntries, settings, companies);

  // Year = sum of 12 monthly breakdowns (akontacija is decided per month).
  const months = Array.from({ length: 12 }, (_, m) => {
    const r = monthRange(new Date(ref.getFullYear(), m, 1));
    return computeBreakdown(inRange(r.start, r.end), settings, companies);
  });
  const yearB = sumBreakdowns(months);
  const b = period === "month" ? monthB : yearB;
  const takeHome = (x: NetBreakdown) => x.netBeforeTax;
  const maxMonth = Math.max(1, ...months.map(takeHome));
  const monthLabel = (m: number) =>
    new Date(ref.getFullYear(), m, 1).toLocaleDateString(locale === "sl" ? "sl-SI" : "en-GB", { month: "short" });


  // per-company breakdown for the month
  const perCompany = companies
    .map((c, i) => ({
      company: c,
      color: companyColor(i),
      b: computeBreakdown(monthEntries.filter((e) => e.company_id === c.id), settings, companies),
    }))
    .filter(({ b }) => b.gross > 0);
  const unassignedB = computeBreakdown(monthEntries.filter((e) => !e.company_id), settings, companies);

  // annual allowance progress (gross earned this calendar year)
  const yearStart = new Date(ref.getFullYear(), 0, 1);
  const yearEnd = new Date(ref.getFullYear(), 11, 31);
  const yearGross = computeBreakdown(inRange(yearStart, yearEnd), settings, companies).gross;
  const allowancePct = Math.min(100, (yearGross / settings.annual_allowance) * 100);
  const nearLimit = allowancePct >= 85 && allowancePct < 100;
  const overLimit = allowancePct >= 100;

  return (
    <div style={{ padding: "20px 18px 100px" }}>
      {/* Month / Year toggle */}
      <div style={segmented} role="tablist">
        {(["month", "year"] as const).map((p) => (
          <button key={p} role="tab" aria-selected={period === p} onClick={() => setPeriod(p)} style={period === p ? segActive : segIdle}>
            {L(p)}
          </button>
        ))}
      </div>

      {/* Period selector */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "14px 0 12px" }}>
        <button onClick={() => setRef(addMonths(ref, period === "month" ? -1 : -12))} style={navBtn} aria-label="Previous">‹</button>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{period === "month" ? format(ref, "LLLL yyyy") : ref.getFullYear()}</h2>
        <button onClick={() => setRef(addMonths(ref, period === "month" ? 1 : 12))} style={navBtn} aria-label="Next">›</button>
      </div>

      {/* Monthly breakdown card — mirrors the screenshot */}
      <div style={breakCard}>
        <div style={breakHead}>
          <span className="figure" style={{ fontSize: 44, display: "block", lineHeight: 1.05 }}>
            {eur(b.netBeforeTax, locale)}
          </span>
          <span style={{ display: "block", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", opacity: 0.85, marginTop: 4 }}>{L("netCaps")}</span>
          <span style={{ display: "block", fontSize: 14, opacity: 0.8, marginTop: 2 }}>{fmtHours(b.hours)}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            {b.akontacija > 0 && (
              <span style={advancePill}>−{eur(b.akontacija, locale)} {L("taxAdvance")}</span>
            )}
            <span style={{ fontSize: 15 }}>
              <b className="figure">{eur(b.netAfterTax, locale)}</b> {L("paidOut")}
            </span>
          </div>
        </div>

        <button onClick={() => setOpen(!open)} style={toggle}>
          {open ? L("hideBreakdown") : L("viewBreakdown")} {open ? "↑" : "↓"}
        </button>

        {open && (
          <div style={{ padding: "4px 18px 18px" }}>
            <Row label={L("grossEarnings")} value={eur(b.gross, locale)} />
            <Row label={`${L("piz")} (${settings.piz_pct}%)`} value={`− ${eur(b.piz, locale)}`} muted />
            {settings.pdo_pct > 0 && <Row label={`${L("pdo")} (${settings.pdo_pct}%)`} value={`− ${eur(b.pdo, locale)}`} muted />}
            <Row label={L("netBeforeTax")} value={eur(b.netBeforeTax, locale)} bold divider />
            {b.akontacija > 0 && (
              <Row label={`${L("incomeTaxAdvance")} (${settings.akontacija_pct}% ${L("ofGross")})`} value={`− ${eur(b.akontacija, locale)}`} muted />
            )}
            <Row label={L("paidOutTitle")} value={eur(b.netAfterTax, locale)} bold divider money />
            {b.akontacija > 0 && (
              <p style={{ fontSize: 12, color: "var(--text-soft)", lineHeight: 1.5, margin: "12px 0 0" }}>
                {L("advanceHint")}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Year: month-by-month */}
      {period === "year" && (
        <div style={{ marginTop: 22 }}>
          <span style={cardLabel}>{L("byMonth")}</span>
          {/* mini bar chart */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 90, marginTop: 12 }} aria-hidden>
            {months.map((mb, m) => (
              <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
                <div style={{ width: "100%", height: `${Math.max(mb.gross ? 4 : 2, (takeHome(mb) / maxMonth) * 72)}px`, borderRadius: 4, background: mb.gross ? "var(--grad)" : "var(--surface-2)" }} />
                <span style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase" }}>{monthLabel(m).slice(0, 1)}</span>
              </div>
            ))}
          </div>
          {/* list */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 20, marginTop: 14 }}>
            {months.map((mb, m) => (
              <div key={m} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--line)", fontSize: 14 }}>
                <span style={{ color: "var(--text-soft)", textTransform: "capitalize" }}>{monthLabel(m).replace(".", "")}</span>
                <span className="figure" style={{ fontWeight: 600, color: mb.gross ? "var(--text)" : "var(--text-faint)" }}>
                  {mb.gross ? eur(takeHome(mb), locale) : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-company breakdown (month view) */}
      {period === "month" && (perCompany.length > 0 || unassignedB.gross > 0) && (
        <div style={{ marginTop: 16, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px 4px", fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {locale === "sl" ? "Po podjetjih" : "By company"}
          </div>
          {perCompany.map(({ company, color, b: cb }) => (
            <div key={company.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderTop: "1px solid var(--line)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: color, display: "inline-block", flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>{company.name}</span>
                <span style={{ fontSize: 12, color: "var(--text-soft)" }}>
                  {cb.hours > 0 ? fmtHours(cb.hours) : locale === "sl" ? "ročno" : "manual"}
                </span>
              </div>
              <span className="figure" style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{eur(cb.netBeforeTax, locale)}</span>
            </div>
          ))}
          {unassignedB.gross > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderTop: "1px solid var(--line)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--ink)", display: "inline-block", flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-soft)" }}>{locale === "sl" ? "Brez podjetja" : "No company"}</span>
                <span style={{ fontSize: 12, color: "var(--text-soft)" }}>{fmtHours(unassignedB.hours)}</span>
              </div>
              <span className="figure" style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{eur(unassignedB.netBeforeTax, locale)}</span>
            </div>
          )}
        </div>
      )}

      {/* Annual allowance */}
      <div style={{ marginTop: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{L("annualAllowance")}</span>
          <span style={{ fontSize: 13, color: "var(--text-soft)" }}>
            {eur(yearGross, locale)} / {eur(settings.annual_allowance, locale)}
          </span>
        </div>
        <div style={barTrack}>
          <div style={{
            width: `${allowancePct}%`,
            height: "100%",
            background: overLimit ? "var(--danger)" : nearLimit ? "var(--danger)" : "var(--money)",
            borderRadius: 6,
            transition: "width 0.4s ease",
          }} />
        </div>
        <span style={{ fontSize: 12, color: "var(--text-soft)" }}>{allowancePct.toFixed(0)}% {L("allowanceUsed")}</span>
        {nearLimit && <p style={{ fontSize: 13, color: "var(--danger)", margin: "8px 0 0", fontWeight: 500 }}>{L("allowanceNearLimit")}</p>}
        {overLimit && <p style={{ fontSize: 13, color: "var(--danger)", margin: "8px 0 0", fontWeight: 500 }}>{L("allowanceOverLimit")}</p>}
      </div>

      {b.hours === 0 && (
        <p style={{ color: "var(--text-faint)", fontSize: 14, marginTop: 20 }}>{L(period === "month" ? "noEntriesMonth" : "noEntriesYear")}</p>
      )}
    </div>
  );
}

function Row({ label, value, muted, bold, divider, money }: { label: string; value: string; muted?: boolean; bold?: boolean; divider?: boolean; money?: boolean }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", padding: "9px 0", fontSize: 14,
      borderTop: divider ? "1px solid var(--line)" : "none",
      marginTop: divider ? 4 : 0,
    }}>
      <span style={{ color: muted ? "var(--text-soft)" : "var(--text)", fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span className="figure" style={{ whiteSpace: "nowrap", marginLeft: 12, fontWeight: bold ? 700 : 500, color: money ? "var(--money)" : bold ? "var(--ink)" : "var(--text)", fontSize: 14 }}>{value}</span>
    </div>
  );
}

const cardLabel: React.CSSProperties = { fontSize: 12, color: "var(--text-soft)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" };
const breakCard: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden" };
const breakHead: React.CSSProperties = { background: "var(--grad)", color: "#fff", padding: "20px 18px 16px" };
const toggle: React.CSSProperties = { width: "100%", padding: "12px", border: "none", borderBottom: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--ink)", fontSize: 13, fontWeight: 600 };
const navBtn: React.CSSProperties = { border: "1px solid var(--line)", background: "var(--surface)", width: 36, height: 36, borderRadius: 10, fontSize: 18, color: "var(--text)" };
const advancePill: React.CSSProperties = { display: "inline-block", padding: "5px 10px", borderRadius: 999, background: "rgba(12,10,29,0.35)", fontSize: 13, fontWeight: 600 };
const segmented: React.CSSProperties = { display: "flex", gap: 4, background: "var(--surface-2)", padding: 4, borderRadius: "var(--radius-sm)", border: "1px solid var(--line)" };
const segActive: React.CSSProperties = { flex: 1, padding: "9px", borderRadius: 7, border: "none", background: "var(--grad)", color: "#fff", fontWeight: 600, fontSize: 14 };
const segIdle: React.CSSProperties = { flex: 1, padding: "9px", borderRadius: 7, border: "none", background: "transparent", color: "var(--text-soft)", fontWeight: 600, fontSize: 14 };
const barTrack: React.CSSProperties = { height: 12, background: "var(--line)", borderRadius: 6, overflow: "hidden", marginBottom: 6 };

function sumBreakdowns(list: NetBreakdown[]): NetBreakdown {
  const add = (k: keyof NetBreakdown) => list.reduce((s, x) => s + (x[k] as number), 0);
  const akontacija = add("akontacija");
  return {
    hours: add("hours"), gross: add("gross"), piz: add("piz"), pdo: add("pdo"),
    netBeforeTax: add("netBeforeTax"), akontacija, netAfterTax: add("netBeforeTax") - akontacija,
    akontacijaApplies: akontacija > 0,
  };
}
