"use client";

import { Entry, Settings } from "@/lib/earnings";
import { Locale, tr } from "@/lib/i18n";
import { exportCsv, exportPdf } from "@/lib/export";
import { createClient } from "@/lib/supabase/client";

interface Props {
  entries: Entry[];
  settings: Settings;
  onSave: (s: Partial<Settings>) => void;
}

export default function SettingsScreen({ entries, settings, onSave }: Props) {
  const locale = settings.locale as Locale;
  const L = (k: Parameters<typeof tr>[0]) => tr(k, locale);
  const supabase = createClient();

  return (
    <div style={{ padding: "20px 18px 100px" }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 22px" }}>{L("settings")}</h2>

      {/* Rate */}
      <Group title={L("hourlyRate")}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="number" step="0.01" min="0"
            value={settings.gross_rate}
            onChange={(e) => onSave({ gross_rate: parseFloat(e.target.value) || 0 })}
            style={input}
          />
          <span style={{ color: "var(--text-soft)", fontWeight: 600 }}>€ / h {L("gross").toLowerCase()}</span>
        </div>
      </Group>

      {/* Rounding */}
      <Group title={L("rounding")}>
        <div style={segmented}>
          {([["none", L("roundingNone")], ["15", L("rounding15")], ["30", L("rounding30")]] as const).map(([v, lbl]) => (
            <button key={v} onClick={() => onSave({ rounding: v })} style={settings.rounding === v ? segActive : segIdle}>
              {lbl}
            </button>
          ))}
        </div>
      </Group>

      {/* Language */}
      <Group title={L("language")}>
        <div style={segmented}>
          <button onClick={() => onSave({ locale: "en" })} style={settings.locale === "en" ? segActive : segIdle}>English</button>
          <button onClick={() => onSave({ locale: "sl" })} style={settings.locale === "sl" ? segActive : segIdle}>Slovenščina</button>
        </div>
      </Group>

      {/* Tax config */}
      <Group title={L("taxConfig")}>
        <p style={{ fontSize: 12, color: "var(--text-soft)", margin: "0 0 14px", lineHeight: 1.5 }}>{L("taxConfigNote")}</p>
        <NumRow label={`${L("piz")} (%)`} value={settings.piz_pct} onChange={(v) => onSave({ piz_pct: v })} />
        <NumRow label={`${L("pdo")} (%)`} value={settings.pdo_pct} onChange={(v) => onSave({ pdo_pct: v })} />
        <NumRow label={`${L("akontacija")} (%)`} value={settings.akontacija_pct} onChange={(v) => onSave({ akontacija_pct: v })} />
        <NumRow label={`${L("akontacija")} ${L("ofGross")} > €`} value={settings.akontacija_threshold} onChange={(v) => onSave({ akontacija_threshold: v })} />
        <NumRow label={`${L("annualAllowance")} (€)`} value={settings.annual_allowance} onChange={(v) => onSave({ annual_allowance: v })} />
      </Group>

      {/* Export */}
      <Group title={L("export")}>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => exportCsv(entries, settings, locale)} style={outlineBtn}>{L("exportCsv")}</button>
          <button onClick={() => exportPdf(entries, settings, locale, `${L("appName")} — ${L("thisMonth")}`)} style={outlineBtn}>{L("exportPdf")}</button>
        </div>
      </Group>

      <button
        onClick={async () => { await supabase.auth.signOut(); location.href = "/login"; }}
        style={signOutBtn}
      >
        {L("signOut")}
      </button>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-soft)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 12px" }}>{title}</h3>
      {children}
    </div>
  );
}

function NumRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
      <span style={{ fontSize: 14, color: "var(--text)" }}>{label}</span>
      <input
        type="number" step="0.01"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        style={{ ...input, width: 110, textAlign: "right" }}
      />
    </div>
  );
}

const input: React.CSSProperties = { padding: "11px 13px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)", fontSize: 16, background: "var(--surface)", color: "var(--text)", width: 130, fontVariantNumeric: "tabular-nums" };
const segmented: React.CSSProperties = { display: "flex", gap: 4, background: "var(--surface-2)", padding: 4, borderRadius: "var(--radius-sm)", border: "1px solid var(--line)" };
const segActive: React.CSSProperties = { flex: 1, padding: "10px", borderRadius: 7, border: "none", background: "var(--grad)", color: "#fff", fontWeight: 600, fontSize: 14 };
const segIdle: React.CSSProperties = { flex: 1, padding: "10px", borderRadius: 7, border: "none", background: "transparent", color: "var(--text-soft)", fontWeight: 600, fontSize: 14 };
const outlineBtn: React.CSSProperties = { flex: 1, padding: 13, borderRadius: "var(--radius-sm)", border: "1px solid var(--ink)", background: "var(--surface)", color: "var(--ink)", fontSize: 14, fontWeight: 600 };
const signOutBtn: React.CSSProperties = { width: "100%", padding: 14, borderRadius: "var(--radius-sm)", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--clay)", fontSize: 15, fontWeight: 600, marginTop: 10 };
