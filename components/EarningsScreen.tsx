"use client";

import { useState } from "react";
import { Entry, Settings, NetBreakdown, computeBreakdown, eur, fmtHours } from "@/lib/earnings";
import { Locale, tr } from "@/lib/i18n";
import { weekRange, monthRange, addMonths, format } from "@/lib/dates";

interface Props {
  entries: Entry[];
  settings: Settings;
}

export default function EarningsScreen({ entries, settings }: Props) {
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
  const monthB = computeBreakdown(monthEntries, settings);

  // Year = sum of 12 monthly breakdowns (akontacija is decided per month).
  const months = Array.from({ length: 12 }, (_, m) => {
    const r = monthRange(new Date(ref.getFullYear(), m, 1));
    return computeBreakdown(inRange(r.start, r.end), settings);
  });
  const yearB = sumBreakdowns(months);
  const b = period === "month" ? monthB : yearB;
  const takeHome = (x: NetBreakdown) => x.netBeforeTax;
  const maxMonth = Math.max(1, ...months.map(takeHome));
  const monthLabel = (m: number) =>
    new Date(ref.getFullYear(), m, 1).toLocaleDateString(locale === "sl" ? "sl-SI" : "en-GB", { month: "short" });

  const { start: ws, end: we } = weekRange(new Date());
  const weekB = computeBreakdown(inRange(ws, we), settings);

  // annual allowance progress (gross earned this calendar year)
  const yearStart = new Date(ref.getFullYear(), 0, 1);
  const yearEnd = new Date(ref.getFullYear(), 11, 31);
  const yearGross = computeBreakdown(inRange(yearStart, yearEnd), settings).gross;
  const allowancePct = Math.min(100, (yearGross / settings.annual_allowance) * 100);
  const nearLimit = allowancePct >= 85 && allowancePct < 100;
  const overLimit = allowancePct >= 100;

  return (
    <div style={{ padding: "20px 18px 100px" }}>
      {/* This week (net only) */}
      <div style={smallCard}>
        <span style={cardLabel}>{L("netLabel")} · {L("thisWeek")}</span>
        <span className="figure" style={{ fontSize: 26 }}>{eur(weekB.netBeforeTax, locale)}</span>
        <span style={{ fontSize: 12, color: "var(--text-soft)" }}>{fmtHours(weekB.hours)}</span>
      </div>

      {/* Month / Year toggle */}
      <div style={{ ...segmented, marginTop: 22 }} role="tablist">
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
          <span style={{ fontSize: 13, opacity: 0.85 }}>{L("netLabel")} · {period === "month" ? L("month") : L("year")}</span>
          <span className="figure" style={{ fontSize: 36, display: "block", margin: "4px 0 2px" }}>
            {eur(b.netBeforeTax, locale)}
          </span>
          <span style={{ fontSize: 12, opacity: 0.8 }}>{fmtHours(b.hours)}</span>
          {b.akontacija > 0 && (
            <span style={advancePill}>
              −{eur(b.akontacija, locale)} {L("advanceWithheld")} → <b>{eur(b.netAfterTax, locale)}</b> {L("paidOut")}
            </span>
          )}
        </div>

        <button onClick={() => setOpen(!open)} style={toggle}>
          {open ? L("hideBreakdown") : L("showBreakdown")} {open ? "▲" : "▼"}
        </button>

        {open && (
          <div style={{ padding: "4px 18px 18px" }}>
            <Row label={L("grossEarnings")} value={eur(b.gross, locale)} />
            <Row label={`${L("piz")} (${settings.piz_pct}%)`} value={`− ${eur(b.piz, locale)}`} muted />
            <Row label={`${L("pdo")} (${settings.pdo_pct}%)`} value={`− ${eur(b.pdo, locale)}`} muted />
            <Row label={L("netBeforeTax")} value={eur(b.netBeforeTax, locale)} bold divider />
            {(b.akontacija > 0) && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "14px 0 4px" }}>
                  {L("incomeTaxAdvance")}
                </div>
                <Row label={`${L("akontacija")} (${settings.akontacija_pct}% ${L("ofGross")})`} value={`− ${eur(b.akontacija, locale)}`} muted />
                <Row label={L("netAfterTax")} value={eur(b.netAfterTax, locale)} bold divider />
                <p style={{ fontSize: 12, color: "var(--text-soft)", lineHeight: 1.5, margin: "12px 0 0" }}>
                  {L("advanceHint")}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Year: month-by-month */}
      {period === "year" && (
        <div style={{ marginTop: 22 }}>
          <span style={cardLabel}>{L("byMonth")}</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            {months.map((mb, m) => (
              <div key={m} style={{ display: "grid", gridTemplateColumns: "44px 1fr 86px", alignItems: "center", gap: 10, fontSize: 13 }}>
                <span style={{ color: "var(--text-soft)", textTransform: "capitalize" }}>{monthLabel(m)}</span>
                <div style={{ height: 10, borderRadius: 5, background: "var(--surface-2)", overflow: "hidden" }}>
                  <div style={{ width: `${(takeHome(mb) / maxMonth) * 100}%`, height: "100%", background: "var(--grad)", borderRadius: 5 }} />
                </div>
                <span className="figure" style={{ textAlign: "right", fontWeight: 600, color: mb.hours ? "var(--text)" : "var(--text-faint)" }}>
                  {mb.hours ? eur(takeHome(mb), locale) : "—"}
                </span>
              </div>
            ))}
          </div>
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
            background: overLimit ? "var(--clay)" : nearLimit ? "var(--clay)" : "var(--sage)",
            borderRadius: 6,
            transition: "width 0.4s ease",
          }} />
        </div>
        <span style={{ fontSize: 12, color: "var(--text-soft)" }}>{allowancePct.toFixed(0)}% {L("allowanceUsed")}</span>
        {nearLimit && <p style={{ fontSize: 13, color: "var(--clay)", margin: "8px 0 0", fontWeight: 500 }}>{L("allowanceNearLimit")}</p>}
        {overLimit && <p style={{ fontSize: 13, color: "var(--clay)", margin: "8px 0 0", fontWeight: 500 }}>{L("allowanceOverLimit")}</p>}
      </div>

      {b.hours === 0 && (
        <p style={{ color: "var(--text-faint)", fontSize: 14, marginTop: 20 }}>{L(period === "month" ? "noEntriesMonth" : "noEntriesYear")}</p>
      )}
    </div>
  );
}

function Row({ label, value, muted, bold, divider }: { label: string; value: string; muted?: boolean; bold?: boolean; divider?: boolean }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", padding: "9px 0", fontSize: 14,
      borderTop: divider ? "1px solid var(--line)" : "none",
      marginTop: divider ? 4 : 0,
    }}>
      <span style={{ color: muted ? "var(--text-soft)" : "var(--text)", fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span className="figure" style={{ fontWeight: bold ? 700 : 500, color: bold ? "var(--ink)" : "var(--text)", fontSize: 14 }}>{value}</span>
    </div>
  );
}

const smallCard: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 2 };
const cardLabel: React.CSSProperties = { fontSize: 12, color: "var(--text-soft)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" };
const breakCard: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden" };
const breakHead: React.CSSProperties = { background: "var(--grad)", color: "#fff", padding: "20px 18px 16px" };
const toggle: React.CSSProperties = { width: "100%", padding: "12px", border: "none", borderBottom: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--ink)", fontSize: 13, fontWeight: 600 };
const navBtn: React.CSSProperties = { border: "1px solid var(--line)", background: "var(--surface)", width: 36, height: 36, borderRadius: 10, fontSize: 18, color: "var(--text)" };
const advancePill: React.CSSProperties = { display: "inline-block", marginTop: 12, padding: "6px 10px", borderRadius: 8, background: "rgba(18,10,36,0.35)", fontSize: 12, lineHeight: 1.4 };
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
