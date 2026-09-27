"use client";

// "Add hours" — the fast path. Duration + worked/planned + live net estimate.
// Remembers the last duration and company so a repeat shift is one tap.
import { useState } from "react";
import { Company, Entry, Settings, eur, fmtHours, netBeforeTax, rawMinutes } from "@/lib/earnings";
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
  onClose: () => void;
}

export default function QuickAdd({ settings, companies, defaultDate, fallbackCompanyId, locale, onSave, onClose }: Props) {
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

  // "More options" — expands in place
  const [more, setMore] = useState(false);
  const [label, setLabel] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [amount, setAmount] = useState("");
  const [amountType, setAmountType] = useState<"gross" | "net">("net");

  const clamp = (m: number) => Math.max(15, Math.min(24 * 60, m));
  const amt = parseFloat(amount.replace(",", "."));
  const useAmount = amt > 0;
  const useTimes = !useAmount && !!start && !!end;
  const draft: Partial<Entry> = {
    work_date: date, status, company_id: companyId, label: label.trim() || null,
    duration_minutes: useAmount || useTimes ? null : mins,
    start_time: useTimes ? start : null,
    end_time: useTimes ? end : null,
    crosses_midnight: false,
    gross_override: useAmount && amountType === "gross" ? amt : null,
    net_override: useAmount && amountType === "net" ? amt : null,
  };
  const shownMins = useTimes ? rawMinutes(start, end) : mins;
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

        {/* date chip — tap to change; single company shown as a quiet label */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <label style={dateChip}>
            📅 {dateLabel} ▾
            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} style={hiddenDate} aria-label={L("date")} />
          </label>
          {hourly.length === 1 && (
            <span style={{ ...dateChip, cursor: "default", color: "var(--text-soft)", background: "transparent" }}>{hourly[0].name}</span>
          )}
        </div>

        {/* duration */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "18px 0 6px" }}>
          <button type="button" onClick={() => setMins(clamp(mins - 15))} style={stepBtn} aria-label="−15 min">−</button>
          <span className="figure" style={{ fontSize: 44, lineHeight: 1, opacity: useAmount ? 0.3 : 1 }}>{fmtHours(shownMins / 60)}</span>
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
          <span style={{ display: "block", fontSize: 13, color: "var(--text-soft)", marginTop: 2 }}>
            {status === "planned" ? L("estimatedPlanned") : L("estimatedNet")}
          </span>
        </div>

        <button onClick={add} style={addBtn}>{L("add")}</button>
        <button onClick={() => setMore(!more)} style={moreBtn} aria-expanded={more}>
          {more ? L("fewerOptions") : L("moreOptionsShort")} {more ? "▴" : "▾"}
        </button>

        {more && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 6, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
            <Opt title={L("timesInstead")} hint={L("timesHint")}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="time" value={start} onChange={(e) => setStart(e.target.value)} style={field} aria-label={L("start")} />
                <span style={{ color: "var(--text-faint)" }}>–</span>
                <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} style={field} aria-label={L("end")} />
              </div>
            </Opt>
            <Opt title={L("amountInstead")} hint={L("amountHint")}>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="number" inputMode="decimal" step="0.01" min="0" placeholder="€" value={amount}
                  onChange={(e) => setAmount(e.target.value)} style={{ ...field, flex: 1 }} aria-label={L("amountInstead")} />
                <div style={{ ...segmented, padding: 3, flex: "none" }}>
                  <button onClick={() => setAmountType("net")} style={{ ...(amountType === "net" ? segActive : segIdle), padding: "7px 12px" }}>{L("net")}</button>
                  <button onClick={() => setAmountType("gross")} style={{ ...(amountType === "gross" ? segActive : segIdle), padding: "7px 12px" }}>{L("gross")}</button>
                </div>
              </div>
            </Opt>
            <Opt title={L("label")}>
              <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={L("labelHint")} style={field} />
            </Opt>
          </div>
        )}
      </div>
    </div>
  );
}

function Opt({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-soft)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{title}</div>
      {children}
      {hint && <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

const field: React.CSSProperties = {
  width: "100%", padding: "11px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)",
  background: "var(--surface-2)", color: "var(--text)", fontSize: 16, minWidth: 0,
};

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
  position: "relative", display: "inline-flex", alignItems: "center", gap: 6,
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
