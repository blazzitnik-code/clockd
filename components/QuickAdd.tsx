"use client";

// "Add hours" — the fast path. Duration + worked/planned + live net estimate.
// Remembers the last duration and company so a repeat shift is one tap.
import { useState } from "react";
import { Company, Entry, Settings, eur, fmtHours, netBeforeTax } from "@/lib/earnings";
import { Locale, tr } from "@/lib/i18n";
import { localISO } from "@/lib/dates";

const LAST_KEY = "clockd.lastQuick";
const QUICK = [4, 6, 8];

interface Last { mins: number; companyId: string | null }

function readLast(): Last | null {
  try {
    const v = JSON.parse(localStorage.getItem(LAST_KEY) || "null");
    return v && typeof v.mins === "number" ? v : null;
  } catch { return null; }
}
function writeLast(v: Last) {
  try { localStorage.setItem(LAST_KEY, JSON.stringify(v)); } catch { /* storage unavailable */ }
}

interface Props {
  settings: Settings;
  companies: Company[];
  defaultDate: string;
  fallbackCompanyId: string | null;
  locale: Locale;
  onSave: (e: Partial<Entry>) => void;
  onMore: (draft: Partial<Entry>) => void;
  onClose: () => void;
}

export default function QuickAdd({ settings, companies, defaultDate, fallbackCompanyId, locale, onSave, onMore, onClose }: Props) {
  const L = (k: Parameters<typeof tr>[0]) => tr(k, locale);
  const hourly = companies.filter((c) => c.gross_rate != null || (c.rates?.length ?? 0) > 0);
  const [last] = useState(readLast);
  const [mins, setMins] = useState(last?.mins ?? 8 * 60);
  const [date, setDate] = useState(defaultDate);
  const [status, setStatus] = useState<"worked" | "planned">("worked");
  const initialCompany =
    [last?.companyId, fallbackCompanyId].find((id) => id && hourly.some((c) => c.id === id)) ??
    hourly[0]?.id ?? null;
  const [companyId, setCompanyId] = useState<string | null>(initialCompany);

  const clamp = (m: number) => Math.max(15, Math.min(24 * 60, m));
  const draft: Partial<Entry> = {
    work_date: date, status, company_id: companyId, duration_minutes: mins,
    start_time: null, end_time: null, crosses_midnight: false,
    gross_override: null, net_override: null, label: null,
  };
  const estimate = netBeforeTax([{ ...(draft as Entry), status: "worked" }], settings, companies);

  const todayIso = localISO(new Date());
  const y = new Date(); y.setDate(y.getDate() - 1);
  const dateLabel =
    date === todayIso ? L("today") :
    date === localISO(y) ? L("yesterday") :
    new Date(date + "T00:00:00").toLocaleDateString(locale === "sl" ? "sl-SI" : "en-GB", { weekday: "short", day: "numeric", month: "short" });

  function add() {
    writeLast({ mins, companyId });
    onSave(draft);
    onClose();
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={sheet} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="qa-title">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 id="qa-title" style={{ margin: 0, fontSize: 18 }}>{L("addHours")}</h2>
          <button onClick={onClose} style={closeBtn} aria-label={L("cancel")}>✕</button>
        </div>

        {/* date chip — tap to change */}
        <label style={dateChip}>
          📅 {dateLabel} ▾
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} style={hiddenDate} aria-label={L("date")} />
        </label>

        {/* duration */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "18px 0 6px" }}>
          <button type="button" onClick={() => setMins(clamp(mins - 15))} style={stepBtn} aria-label="−15 min">−</button>
          <span className="figure" style={{ fontSize: 44, lineHeight: 1 }}>{fmtHours(mins / 60)}</span>
          <button type="button" onClick={() => setMins(clamp(mins + 15))} style={stepBtn} aria-label="+15 min">+</button>
        </div>
        <input type="range" min={15} max={12 * 60} step={15} value={Math.min(mins, 12 * 60)}
          onChange={(e) => setMins(Number(e.target.value))}
          style={{ width: "100%", accentColor: "var(--ink)" }} aria-label={L("duration")} />
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 10 }}>
          {QUICK.map((h) => (
            <button key={h} type="button" onClick={() => setMins(h * 60)} style={mins === h * 60 ? chipOn : chip}>{h}h</button>
          ))}
        </div>

        {/* company (only when there is a choice) */}
        {hourly.length > 1 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 16 }}>
            {hourly.map((c) => (
              <button key={c.id} type="button" onClick={() => setCompanyId(c.id)} style={companyId === c.id ? chipOn : chip}>{c.name}</button>
            ))}
          </div>
        )}

        {/* worked / planned */}
        <div style={{ ...segmented, marginTop: 16 }}>
          <button onClick={() => setStatus("worked")} style={status === "worked" ? segActive : segIdle}>{L("worked")}</button>
          <button onClick={() => setStatus("planned")} style={status === "planned" ? segActive : segIdle}>{L("planned")}</button>
        </div>

        {/* live estimate */}
        <div style={{ textAlign: "center", margin: "18px 0 14px" }}>
          <span className="figure" style={{ fontSize: 30, color: "var(--money)" }}>{eur(estimate, locale)}</span>
          <span style={{ display: "block", fontSize: 13, color: "var(--text-soft)", marginTop: 2 }}>{L("estimatedNet")}</span>
        </div>

        <button onClick={add} style={addBtn}>{L("add")}</button>
        <button onClick={() => onMore(draft)} style={moreBtn}>{L("moreOptions")}</button>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(8,4,18,0.65)",
  display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50,
};
const sheet: React.CSSProperties = {
  background: "var(--surface)", borderRadius: "20px 20px 0 0", padding: "22px 22px calc(18px + env(safe-area-inset-bottom))",
  width: "100%", maxWidth: 480, maxHeight: "92dvh", overflowY: "auto",
};
const closeBtn: React.CSSProperties = {
  border: "none", background: "var(--surface-2)", width: 32, height: 32,
  borderRadius: 8, color: "var(--text-soft)", fontSize: 14,
};
const dateChip: React.CSSProperties = {
  position: "relative", display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12,
  padding: "6px 12px", borderRadius: 999, background: "var(--surface-2)", border: "1px solid var(--line)",
  color: "var(--text)", fontSize: 14, fontWeight: 600, cursor: "pointer",
};
const hiddenDate: React.CSSProperties = { position: "absolute", inset: 0, opacity: 0, cursor: "pointer" };
const stepBtn: React.CSSProperties = {
  width: 52, height: 52, borderRadius: 14, border: "1px solid var(--line)",
  background: "var(--surface-2)", color: "var(--text)", fontSize: 26, fontWeight: 600,
};
const chip: React.CSSProperties = {
  padding: "7px 14px", borderRadius: 999, border: "1px solid var(--line)",
  background: "var(--surface-2)", color: "var(--text-soft)", fontSize: 14, fontWeight: 600,
};
const chipOn: React.CSSProperties = { ...chip, background: "var(--grad)", color: "#fff", border: "1px solid transparent" };
const segmented: React.CSSProperties = { display: "flex", gap: 4, background: "var(--surface-2)", padding: 4, borderRadius: "var(--radius-sm)" };
const segActive: React.CSSProperties = { flex: 1, padding: 10, borderRadius: 7, border: "none", background: "var(--grad)", color: "#fff", fontWeight: 600, fontSize: 14 };
const segIdle: React.CSSProperties = { flex: 1, padding: 10, borderRadius: 7, border: "none", background: "transparent", color: "var(--text-soft)", fontWeight: 600, fontSize: 14 };
const addBtn: React.CSSProperties = {
  width: "100%", padding: 16, borderRadius: "var(--radius)", border: "none",
  background: "var(--grad)", color: "#fff", fontSize: 17, fontWeight: 700,
};
const moreBtn: React.CSSProperties = {
  display: "block", margin: "8px auto 0", border: "none", background: "transparent",
  color: "var(--text-soft)", fontSize: 13, fontWeight: 600, padding: 8,
};
