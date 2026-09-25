"use client";

import { useState } from "react";
import { Company, Entry, fmtHours } from "@/lib/earnings";
import { Locale, tr } from "@/lib/i18n";

interface Props {
  initial?: Partial<Entry>;
  defaultDate: string;
  defaultCompanyId?: string | null;
  companies: Company[];
  locale: Locale;
  onSave: (e: Partial<Entry>) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

type Mode = "hours" | "amount";
type TimeMode = "duration" | "range";
const QUICK = [4, 6, 8, 10];
type AmountType = "gross" | "net";

export default function EntryEditor({
  initial,
  defaultDate,
  defaultCompanyId,
  companies,
  locale,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const L = (k: Parameters<typeof tr>[0]) => tr(k, locale);

  const isManual = initial?.gross_override != null || initial?.net_override != null;
  const [mode, setMode] = useState<Mode>(isManual ? "amount" : "hours");
  const [amountType, setAmountType] = useState<AmountType>(
    initial?.net_override != null ? "net" : "gross"
  );
  const [amount, setAmount] = useState(
    initial?.gross_override != null ? String(initial.gross_override) :
    initial?.net_override != null ? String(initial.net_override) : ""
  );
  const [date, setDate] = useState(initial?.work_date || defaultDate);
  const [timeMode, setTimeMode] = useState<TimeMode>(
    initial?.duration_minutes != null ? "duration" : initial?.start_time ? "range" : "duration"
  );
  const [mins, setMins] = useState<number>(initial?.duration_minutes ?? 8 * 60);
  const [start, setStart] = useState((initial?.start_time || "").slice(0, 5) || "08:00");
  const [end, setEnd] = useState((initial?.end_time || "").slice(0, 5));
  const [label, setLabel] = useState(initial?.label || "");
  const [status, setStatus] = useState<"worked" | "planned">(initial?.status || "worked");
  const [companyId, setCompanyId] = useState<string | null>(
    initial?.company_id ?? defaultCompanyId ?? null
  );

  const overnight = mode === "hours" && timeMode === "range" && end !== "" && end < start;
  const clampMins = (m: number) => Math.max(0, Math.min(24 * 60, m));
  const canSave = !(mode === "hours" && timeMode === "duration" && status === "worked" && mins === 0);
  const selectedCompany = companies.find((c) => c.id === companyId) ?? null;
  const companyHasNoRate = selectedCompany != null && selectedCompany.gross_rate == null;

  function handleCompanyChange(id: string | null) {
    setCompanyId(id);
    const company = id ? companies.find((c) => c.id === id) : null;
    if (company && company.gross_rate == null) setMode("amount");
  }

  function handleSave() {
    const base: Partial<Entry> = {
      id: initial?.id,
      work_date: date,
      label: label.trim() || null,
      status,
      company_id: companyId || null,
    };

    if (mode === "hours" && timeMode === "duration") {
      onSave({
        ...base,
        start_time: null,
        end_time: null,
        crosses_midnight: false,
        duration_minutes: mins,
        gross_override: null,
        net_override: null,
      });
    } else if (mode === "hours") {
      onSave({
        ...base,
        start_time: start,
        end_time: end || null,
        duration_minutes: null,
        gross_override: null,
        net_override: null,
      });
    } else {
      const amt = parseFloat(amount) || 0;
      onSave({
        ...base,
        start_time: null,
        end_time: null,
        crosses_midnight: false,
        duration_minutes: null,
        gross_override: amountType === "gross" ? amt : null,
        net_override: amountType === "net" ? amt : null,
      });
    }
    onClose();
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={sheet} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>
            {initial?.id ? L("editEntry") : L("addEntry")}
          </h2>
          <button onClick={onClose} style={closeBtn} aria-label={L("cancel")}>✕</button>
        </div>

        {/* worked / planned */}
        <div style={segmented}>
          <button onClick={() => setStatus("worked")} style={status === "worked" ? segActive : segIdle}>{L("worked")}</button>
          <button onClick={() => setStatus("planned")} style={status === "planned" ? segActive : segIdle}>{L("planned")}</button>
        </div>

        {/* company selector */}
        {companies.length > 0 && (
          <Field label={L("company")}>
            <select
              value={companyId ?? ""}
              onChange={(e) => handleCompanyChange(e.target.value || null)}
              style={selectStyle}
            >
              <option value="">{L("noCompany")}</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.gross_rate != null ? ` (${c.gross_rate} €/h)` : ""}</option>
              ))}
            </select>
          </Field>
        )}

        {/* hours / manual amount toggle */}
        <div style={segmented}>
          <button
            onClick={() => setMode("hours")}
            style={mode === "hours" ? segActive : segIdle}
            disabled={companyHasNoRate}
          >
            {L("byHours")}
          </button>
          <button onClick={() => setMode("amount")} style={mode === "amount" ? segActive : segIdle}>
            {L("manualAmount")}
          </button>
        </div>

        <Field label={L("date")}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={input} />
        </Field>

        {mode === "hours" && timeMode === "duration" ? (
          <>
            <div style={durationBox}>
              <span className="figure" style={{ fontSize: 40, lineHeight: 1 }}>{fmtHours(mins / 60)}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", marginTop: 14 }}>
                <button type="button" onClick={() => setMins(clampMins(mins - 15))} style={stepBtn} aria-label="−15 min">−</button>
                <input
                  type="range" min={0} max={12 * 60} step={15}
                  value={Math.min(mins, 12 * 60)}
                  onChange={(e) => setMins(Number(e.target.value))}
                  style={{ flex: 1, accentColor: "var(--ink)" }}
                  aria-label={L("duration")}
                />
                <button type="button" onClick={() => setMins(clampMins(mins + 15))} style={stepBtn} aria-label="+15 min">+</button>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                {QUICK.map((h) => (
                  <button key={h} type="button" onClick={() => setMins(h * 60)} style={mins === h * 60 ? chipOn : chip}>{h}h</button>
                ))}
              </div>
            </div>
            <button type="button" onClick={() => setTimeMode("range")} style={linkBtn}>🕐 {L("enterTimes")}</button>
          </>
        ) : mode === "hours" ? (
          <>
            <div style={{ display: "flex", gap: 12 }}>
              <Field label={L("start")} flex>
                <input type="time" value={start} onChange={(e) => setStart(e.target.value)} style={input} />
              </Field>
              <Field label={L("end")} flex>
                <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} style={input} />
              </Field>
            </div>
            {overnight && <div style={overnightNote}>↳ {L("overnight")}</div>}
            <button type="button" onClick={() => setTimeMode("duration")} style={linkBtn}>⏱ {L("enterDuration")}</button>
          </>
        ) : (
          <>
            <div style={segmented}>
              <button onClick={() => setAmountType("gross")} style={amountType === "gross" ? segActive : segIdle}>{L("gross")}</button>
              <button onClick={() => setAmountType("net")} style={amountType === "net" ? segActive : segIdle}>{L("net")}</button>
            </div>
            <Field label={amountType === "gross" ? L("grossAmount") : L("netAmount")}>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                style={input}
              />
            </Field>
          </>
        )}

        <Field label={L("label")}>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={L("labelHint")}
            style={input}
          />
        </Field>

        <button onClick={handleSave} disabled={!canSave} style={{ ...saveBtn, opacity: canSave ? 1 : 0.5 }}>{L("save")}</button>

        {initial?.id && onDelete && (
          <button
            onClick={() => { onDelete(initial.id!); onClose(); }}
            style={deleteBtn}
          >
            {L("delete")}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, flex }: { label: string; children: React.ReactNode; flex?: boolean }) {
  return (
    <label style={{ display: "block", marginBottom: 14, flex: flex ? 1 : undefined }}>
      <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-soft)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(8,4,18,0.65)",
  display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50,
};
const sheet: React.CSSProperties = {
  background: "var(--surface)", borderRadius: "20px 20px 0 0", padding: 24,
  width: "100%", maxWidth: 480, maxHeight: "90dvh", overflowY: "auto",
};
const input: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: "var(--radius-sm)",
  border: "1px solid var(--line)", fontSize: 16, background: "var(--surface-2)", color: "var(--text)",
};
const selectStyle: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: "var(--radius-sm)",
  border: "1px solid var(--line)", fontSize: 16, background: "var(--surface-2)", color: "var(--text)",
  appearance: "auto",
};
const segmented: React.CSSProperties = {
  display: "flex", gap: 4, background: "var(--surface-2)", padding: 4,
  borderRadius: "var(--radius-sm)", marginBottom: 18,
};
const segActive: React.CSSProperties = {
  flex: 1, padding: "10px", borderRadius: 7, border: "none",
  background: "var(--grad)", color: "#fff", fontWeight: 600, fontSize: 14,
};
const segIdle: React.CSSProperties = {
  flex: 1, padding: "10px", borderRadius: 7, border: "none",
  background: "transparent", color: "var(--text-soft)", fontWeight: 600, fontSize: 14,
};
const saveBtn: React.CSSProperties = {
  width: "100%", padding: 15, borderRadius: "var(--radius-sm)", border: "none",
  background: "var(--grad)", color: "#fff", fontSize: 16, fontWeight: 600, marginTop: 6,
};
const deleteBtn: React.CSSProperties = {
  width: "100%", padding: 13, borderRadius: "var(--radius-sm)", border: "none",
  background: "transparent", color: "var(--clay)", fontSize: 15, fontWeight: 600, marginTop: 8,
};
const closeBtn: React.CSSProperties = {
  border: "none", background: "var(--surface-2)", width: 32, height: 32,
  borderRadius: 8, color: "var(--text-soft)", fontSize: 14,
};
const durationBox: React.CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center",
  background: "var(--surface-2)", borderRadius: "var(--radius)", padding: "18px 16px 16px", marginBottom: 8,
};
const stepBtn: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 10, border: "1px solid var(--line)",
  background: "var(--surface)", color: "var(--text)", fontSize: 20, fontWeight: 600, flexShrink: 0,
};
const chip: React.CSSProperties = {
  padding: "7px 14px", borderRadius: 999, border: "1px solid var(--line)",
  background: "var(--surface)", color: "var(--text-soft)", fontSize: 14, fontWeight: 600,
};
const chipOn: React.CSSProperties = { ...chip, background: "var(--grad)", color: "#fff", border: "1px solid transparent" };
const linkBtn: React.CSSProperties = {
  display: "block", margin: "0 auto 16px", border: "none", background: "transparent",
  color: "var(--ink)", fontSize: 14, fontWeight: 600, padding: 6,
};
const overnightNote: React.CSSProperties = {
  fontSize: 13, color: "var(--ink)", background: "var(--ink-100)",
  padding: "8px 12px", borderRadius: 8, marginBottom: 14, marginTop: -4,
};
