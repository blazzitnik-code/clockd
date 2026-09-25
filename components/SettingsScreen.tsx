"use client";

import { useState } from "react";
import { Company, CompanyRate, Entry, RATE_FROM_START, Settings, eur } from "@/lib/earnings";
import { localISO } from "@/lib/dates";
import { Locale, tr } from "@/lib/i18n";
import { exportCsv, exportPdf } from "@/lib/export";
import { createClient } from "@/lib/supabase/client";

interface Props {
  entries: Entry[];
  settings: Settings;
  companies: Company[];
  onSave: (s: Partial<Settings>) => void;
  onSaveCompany: (c: Partial<Company>) => void;
  onDeleteCompany: (id: string) => void;
  onSaveRate: (r: Partial<CompanyRate> & { company_id: string }) => void;
  onDeleteRate: (r: CompanyRate) => void;
}

export default function SettingsScreen({ entries, settings, companies, onSave, onSaveCompany, onDeleteCompany, onSaveRate, onDeleteRate }: Props) {
  const locale = settings.locale as Locale;
  const L = (k: Parameters<typeof tr>[0]) => tr(k, locale);
  const supabase = createClient();

  const [newName, setNewName] = useState("");
  const [newRate, setNewRate] = useState("");
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  function handleAddCompany() {
    if (!newName.trim()) return;
    const rate = newRate.trim() ? parseFloat(newRate) : null;
    onSaveCompany({ name: newName.trim(), gross_rate: rate });
    setNewName("");
    setNewRate("");
    setAdding(false);
  }

  return (
    <div style={{ padding: "20px 18px 100px" }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 22px" }}>{L("settings")}</h2>

      {/* Companies */}
      <Group title={L("companies")}>
        {companies.length === 0 && !adding && (
          <p style={{ fontSize: 13, color: "var(--text-faint)", margin: "0 0 10px" }}>
            {L("noCompany")}
          </p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: companies.length > 0 ? 10 : 0 }}>
          {companies.map((c) => (
            <CompanyCard
              key={c.id}
              company={c}
              locale={locale}
              open={openId === c.id}
              onToggle={() => setOpenId(openId === c.id ? null : c.id)}
              onSaveRate={onSaveRate}
              onDeleteRate={onDeleteRate}
              onDelete={() => { onDeleteCompany(c.id); setOpenId(null); }}
            />
          ))}
        </div>

        {adding ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              type="text"
              placeholder={L("companyName")}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              style={input}
            />
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder={L("rateOptional")}
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              style={input}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleAddCompany} style={primaryBtn}>{L("addCompany")}</button>
              <button onClick={() => { setAdding(false); setNewName(""); setNewRate(""); }} style={cancelBtn}>{L("cancel")}</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} style={outlineBtn}>+ {L("addCompany")}</button>
        )}
      </Group>

      {/* Rate */}
      <Group title={L("hourlyRate")}>
        <p style={{ fontSize: 12, color: "var(--text-soft)", margin: "0 0 10px", lineHeight: 1.5 }}>
          {locale === "sl" ? "Privzeta urna postavka (če podjetje nima lastne)." : "Default rate used when a company has no rate set."}
        </p>
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
          <button onClick={() => exportCsv(entries, settings, locale, companies)} style={outlineBtn}>{L("exportCsv")}</button>
          <button onClick={() => exportPdf(entries, settings, locale, `${L("appName")} — ${L("thisMonth")}`, companies)} style={outlineBtn}>{L("exportPdf")}</button>
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

function CompanyCard({ company, locale, open, onToggle, onSaveRate, onDeleteRate, onDelete }: {
  company: Company; locale: Locale; open: boolean; onToggle: () => void;
  onSaveRate: Props["onSaveRate"]; onDeleteRate: Props["onDeleteRate"]; onDelete: () => void;
}) {
  const L = (k: Parameters<typeof tr>[0]) => tr(k, locale);
  const rates = [...(company.rates ?? [])].sort((a, b) => (a.valid_from < b.valid_from ? 1 : -1)); // newest first
  const [editing, setEditing] = useState<CompanyRate | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [rate, setRate] = useState("");
  const [from, setFrom] = useState(localISO(new Date()));

  const fmtDate = (d: string) =>
    d === RATE_FROM_START
      ? L("fromStart")
      : `${L("fromDate")} ${new Date(d + "T00:00:00").toLocaleDateString(locale === "sl" ? "sl-SI" : "en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
  const current = rates[0];
  const summary = company.gross_rate != null
    ? `${eur(company.gross_rate, locale)}/h${current && current.valid_from !== RATE_FROM_START ? ` · ${fmtDate(current.valid_from)}` : ""}`
    : L("notHourly");

  function startNew() {
    setEditing(null); setRate(""); setFrom(localISO(new Date())); setFormOpen(true);
  }
  function startEdit(r: CompanyRate) {
    setEditing(r); setRate(String(r.gross_rate)); setFrom(r.valid_from); setFormOpen(true);
  }
  function submit() {
    const v = parseFloat(rate.replace(",", "."));
    if (!v || !from) return;
    const validFrom = rates.length === 0 && !editing ? RATE_FROM_START : from;
    onSaveRate({ id: editing?.id, company_id: company.id, gross_rate: v, valid_from: validFrom });
    setFormOpen(false); setEditing(null);
  }

  return (
    <div style={{ ...companyRow, flexDirection: "column", alignItems: "stretch", padding: 0 }}>
      <button onClick={onToggle} style={companyHead} aria-expanded={open}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{company.name}</span>
        <span style={{ fontSize: 12, color: "var(--text-soft)", marginLeft: 8, flex: 1, textAlign: "left" }}>{summary}</span>
        <span style={{ color: "var(--text-faint)", fontSize: 12 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ padding: "4px 14px 14px", borderTop: "1px solid var(--line)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "10px 0 6px" }}>
            {L("rates")}
          </div>
          {rates.map((r, i) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid var(--line)" }}>
              <span className="figure" style={{ fontSize: 14, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? "var(--text)" : "var(--text-soft)" }}>
                {eur(Number(r.gross_rate), locale)}/h
              </span>
              <span style={{ fontSize: 13, color: "var(--text-soft)", flex: 1 }}>{fmtDate(r.valid_from)}</span>
              <button onClick={() => startEdit(r)} style={iconBtn} aria-label={L("editRate")}>✎</button>
              {rates.length > 1 && (
                <button onClick={() => onDeleteRate(r)} style={{ ...iconBtn, color: "var(--clay)" }} aria-label={L("delete")}>✕</button>
              )}
            </div>
          ))}

          {formOpen ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{editing ? L("editRate") : L("newRate")}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="number" inputMode="decimal" step="0.01" min="0" placeholder="€/h" value={rate}
                  onChange={(e) => setRate(e.target.value)} style={{ ...input, width: "40%" }} autoFocus />
                {!(rates.length === 0 && !editing) && !(editing && editing.valid_from === RATE_FROM_START) && (
                  <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ ...input, flex: 1 }} aria-label={L("validFrom")} />
                )}
              </div>
              {!editing && rates.length > 0 && (
                <p style={{ fontSize: 12, color: "var(--text-soft)", margin: 0, lineHeight: 1.5 }}>{L("rateNote")}</p>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={submit} style={primaryBtn}>{L("save")}</button>
                <button onClick={() => { setFormOpen(false); setEditing(null); }} style={cancelBtn}>{L("cancel")}</button>
              </div>
            </div>
          ) : (
            <button onClick={startNew} style={{ ...outlineBtn, marginTop: 12, width: "100%" }}>+ {L("newRate")}</button>
          )}

          <button onClick={onDelete} style={{ ...deleteBtn, marginTop: 14, width: "100%", fontSize: 13, color: "var(--clay)" }}>{L("deleteCompany")}</button>
        </div>
      )}
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
const primaryBtn: React.CSSProperties = { flex: 1, padding: 13, borderRadius: "var(--radius-sm)", border: "none", background: "var(--grad)", color: "#fff", fontSize: 14, fontWeight: 600 };
const cancelBtn: React.CSSProperties = { padding: "13px 18px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text-soft)", fontSize: 14, fontWeight: 600 };
const signOutBtn: React.CSSProperties = { width: "100%", padding: 14, borderRadius: "var(--radius-sm)", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--clay)", fontSize: 15, fontWeight: 600, marginTop: 10 };
const companyRow: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: "var(--radius-sm)", background: "var(--surface-2)", border: "1px solid var(--line)" };
const deleteBtn: React.CSSProperties = { border: "none", background: "transparent", color: "var(--text-faint)", fontSize: 14, padding: "4px 6px", borderRadius: 6 };
const companyHead: React.CSSProperties = { display: "flex", alignItems: "center", gap: 4, width: "100%", padding: "11px 12px", border: "none", background: "transparent", color: "var(--text)" };
const iconBtn: React.CSSProperties = { border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text-soft)", width: 30, height: 30, borderRadius: 8, fontSize: 13 };
