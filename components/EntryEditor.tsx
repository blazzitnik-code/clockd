"use client";

import { useState } from "react";
import { Entry, Settings } from "@/lib/earnings";
import { Locale, tr } from "@/lib/i18n";
import { localISO } from "@/lib/dates";

interface Props {
  initial?: Partial<Entry>;
  defaultDate: string;
  locale: Locale;
  onSave: (e: Partial<Entry>) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export default function EntryEditor({
  initial,
  defaultDate,
  locale,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const L = (k: Parameters<typeof tr>[0]) => tr(k, locale);
  const [date, setDate] = useState(initial?.work_date || defaultDate);
  const [start, setStart] = useState((initial?.start_time || "").slice(0, 5) || "08:00");
  const [end, setEnd] = useState((initial?.end_time || "").slice(0, 5));
  const [label, setLabel] = useState(initial?.label || "");
  const [status, setStatus] = useState<"worked" | "planned">(
    initial?.status || "worked"
  );

  const overnight = end !== "" && end < start;

  function handleSave() {
    onSave({
      id: initial?.id,
      work_date: date,
      start_time: start,
      end_time: end || null,
      label: label.trim() || null,
      status,
    });
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

        {/* worked / planned toggle */}
        <div style={segmented}>
          <button
            onClick={() => setStatus("worked")}
            style={status === "worked" ? segActive : segIdle}
          >
            {L("worked")}
          </button>
          <button
            onClick={() => setStatus("planned")}
            style={status === "planned" ? segActive : segIdle}
          >
            {L("planned")}
          </button>
        </div>

        <Field label={L("date")}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={input} />
        </Field>

        <div style={{ display: "flex", gap: 12 }}>
          <Field label={L("start")} flex>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} style={input} />
          </Field>
          <Field label={L("end")} flex>
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} style={input} />
          </Field>
        </div>

        {overnight && (
          <div style={overnightNote}>↳ {L("overnight")}</div>
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

        <button onClick={handleSave} style={saveBtn}>{L("save")}</button>

        {initial?.id && onDelete && (
          <button
            onClick={() => {
              onDelete(initial.id!);
              onClose();
            }}
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
const overnightNote: React.CSSProperties = {
  fontSize: 13, color: "var(--ink)", background: "var(--ink-100)",
  padding: "8px 12px", borderRadius: 8, marginBottom: 14, marginTop: -4,
};
