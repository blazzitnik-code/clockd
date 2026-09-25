"use client";

import { useEffect, useState } from "react";
import { Company, Entry, Settings, netBeforeTax, eur, fmtHours, entryHours, rawMinutes } from "@/lib/earnings";
import { Locale, tr } from "@/lib/i18n";
import { localISO, weekRange, monthRange } from "@/lib/dates";
import EntryEditor from "./EntryEditor";

interface Props {
  entries: Entry[];
  settings: Settings;
  companies: Company[];
  onSave: (e: Partial<Entry>) => void;
  onDelete: (id: string) => void;
}

export default function TodayScreen({ entries, settings, companies, onSave, onDelete }: Props) {
  const locale = settings.locale as Locale;
  const L = (k: Parameters<typeof tr>[0]) => tr(k, locale);
  const today = localISO(new Date());
  const [editing, setEditing] = useState<Partial<Entry> | null>(null);
  // tick every 30s so the running session's time + money stay live
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const todays = entries.filter((e) => e.work_date === today);
  const running = todays.find(
    (e) => e.status === "worked" && !e.end_time && !!e.start_time && e.gross_override == null && e.net_override == null
  );

  const longRunning =
    running &&
    rawMinutes(running.start_time, nowTime()) > 14 * 60;

  const { start: ws, end: we } = weekRange(new Date());
  const weekEntries = entries.filter((e) => {
    const d = new Date(e.work_date + "T00:00:00");
    return d >= ws && d <= we;
  });
  const weekNet = netBeforeTax(weekEntries, settings, companies);

  const { start: ms, end: me } = monthRange(new Date());
  const monthEntries = entries.filter((e) => {
    const d = new Date(e.work_date + "T00:00:00");
    return d >= ms && d <= me;
  });
  const monthNet = netBeforeTax(monthEntries, settings, companies);

  // last used company from most recent entry that has one
  const lastCompanyId = entries.find((e) => e.company_id)?.company_id ?? null;

  function startNow() {
    onSave({ work_date: today, start_time: nowTime(), end_time: null, status: "worked" });
  }
  function endNow() {
    if (running) onSave({ ...running, end_time: nowTime() });
  }

  return (
    <div style={{ padding: "20px 18px 100px" }}>
      {/* Hero: this week + this month net */}
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ ...hero, flex: 1, minWidth: 0 }}>
          <span style={heroLabel}>{L("netLabel")} · {L("thisWeek")}</span>
          <span className="figure" style={heroFigure}>{eur(weekNet, locale)}</span>
          <span style={heroSub}>{fmtHours(weekEntries.filter(e=>e.status==="worked"&&e.end_time).reduce((s,e)=>s+entryHours(e,settings),0))}</span>
        </div>
        <div style={{ ...hero, flex: 1, minWidth: 0 }}>
          <span style={heroLabel}>{L("netLabel")} · {L("thisMonth")}</span>
          <span className="figure" style={heroFigure}>{eur(monthNet, locale)}</span>
          <span style={heroSub}>{fmtHours(monthEntries.filter(e=>e.status==="worked"&&e.end_time).reduce((s,e)=>s+entryHours(e,settings),0))}</span>
        </div>
      </div>

      {/* Clock */}
      <div style={{ marginTop: 20 }}>
        {running ? (
          <button onClick={endNow} style={{ ...clockBtn, background: "var(--live)", color: "var(--on-bright)", boxShadow: "0 0 24px rgba(63,169,255,0.35)" }}>
            <PulseDot /> {L("endNow")} · {fmtHours(rawMinutes(running.start_time, nowTime()) / 60)}
          </button>
        ) : (
          <button onClick={startNow} style={clockBtn}>
            ▶ {L("startNow")}
          </button>
        )}
        <button onClick={() => setEditing({ work_date: today })} style={manualBtn}>
          + {L("manualEntry")}
        </button>
      </div>

      {longRunning && (
        <div style={guard}>
          {L("stillWorking")} — {L("running").toLowerCase()} {running!.start_time?.slice(0,5)}.
          <button onClick={() => setEditing(running)} style={guardBtn}>{L("editEntry")}</button>
        </div>
      )}

      <h2 style={sectionTitle}>{L("today")}</h2>
      {todays.length === 0 ? (
        <p style={empty}>{L("noEntriesToday")}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {todays.map((e) => (
            <EntryRow key={e.id} entry={e} settings={settings} companies={companies} locale={locale} onClick={() => setEditing(e)} />
          ))}
        </div>
      )}

      {editing && (
        <EntryEditor
          initial={editing}
          defaultDate={today}
          defaultCompanyId={lastCompanyId}
          companies={companies}
          locale={locale}
          onSave={onSave}
          onDelete={onDelete}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

export function EntryRow({ entry, settings, companies = [], locale, onClick }: { entry: Entry; settings: Settings; companies?: Company[]; locale: Locale; onClick: () => void }) {
  const L = (k: Parameters<typeof tr>[0]) => tr(k, locale);
  const isPlanned = entry.status === "planned";
  const isManual = entry.gross_override != null || entry.net_override != null;
  const isRunning = entry.status === "worked" && !entry.end_time && !isManual && !!entry.start_time;
  const h = entryHours(entry, settings);
  const net = netBeforeTax([entry], settings, companies);
  const live = isRunning ? { ...entry, end_time: nowTime() } : null;
  return (
    <button onClick={onClick} style={{ ...rowCard, ...(isPlanned ? rowPlanned : {}) }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3 }}>
        <span style={{ fontWeight: 600, fontSize: 15 }}>
          {entry.start_time
            ? `${entry.start_time.slice(0, 5)}${entry.end_time ? `–${entry.end_time.slice(0, 5)}` : "–…"}`
            : "●"}
          {entry.crosses_midnight ? <sup style={{ color: "var(--ink)" }}> +1</sup> : null}
        </span>
        <span style={{ fontSize: 13, color: "var(--text-soft)" }}>
          {entry.label || (isManual ? (locale === "sl" ? "ročni vnos" : "manual") : isPlanned ? L("planned") : isRunning ? L("running") : L("worked"))}
        </span>
      </div>
      <div style={{ textAlign: "right" }}>
        {isRunning ? (
          <>
            <span className="figure" style={{ fontSize: 15, color: "var(--live)" }}>{fmtHours(rawMinutes(entry.start_time, live!.end_time) / 60)}</span>
            <span style={{ display: "block", fontSize: 13, color: "var(--text-soft)" }}>{eur(netBeforeTax([live!], settings, companies), locale)} {L("soFar")}</span>
          </>
        ) : isPlanned ? (
          <span style={{ color: "var(--text-faint)", fontSize: 14 }}>—</span>
        ) : (
          <>
            {!isManual && <span className="figure" style={{ fontSize: 15 }}>{fmtHours(h)}</span>}
            <span style={{ display: "block", fontSize: 13, color: "var(--text-soft)" }}>{eur(net, locale)}</span>
          </>
        )}
      </div>
    </button>
  );
}

function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function PulseDot() {
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: "currentColor", marginRight: 4 }} />;
}

const hero: React.CSSProperties = {
  background: "var(--grad)", color: "#fff", borderRadius: "var(--radius)",
  padding: "18px 16px 16px", display: "flex", flexDirection: "column",
};
const heroLabel: React.CSSProperties = { fontSize: 13, opacity: 0.8, fontWeight: 500 };
const heroFigure: React.CSSProperties = { fontSize: 28, margin: "6px 0 2px", lineHeight: 1, whiteSpace: "nowrap" };
const heroSub: React.CSSProperties = { fontSize: 13, opacity: 0.75 };
const clockBtn: React.CSSProperties = {
  width: "100%", padding: 17, borderRadius: "var(--radius)", border: "none",
  background: "var(--grad)", color: "#fff", fontSize: 16, fontWeight: 600,
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
};
const manualBtn: React.CSSProperties = {
  width: "100%", padding: 13, borderRadius: "var(--radius-sm)", border: "1px solid var(--line)",
  background: "var(--surface)", color: "var(--text)", fontSize: 15, fontWeight: 600, marginTop: 10,
};
const guard: React.CSSProperties = {
  background: "var(--clay-100)", color: "var(--clay)", padding: "12px 14px",
  borderRadius: "var(--radius-sm)", marginTop: 14, fontSize: 14, fontWeight: 500,
  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
};
const guardBtn: React.CSSProperties = {
  border: "none", background: "var(--clay)", color: "var(--on-bright)", padding: "6px 12px",
  borderRadius: 8, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
};
const sectionTitle: React.CSSProperties = { fontSize: 14, fontWeight: 700, margin: "26px 0 12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-soft)" };
const empty: React.CSSProperties = { color: "var(--text-faint)", fontSize: 14, lineHeight: 1.5 };
const rowCard: React.CSSProperties = {
  width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: "14px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)",
  background: "var(--surface)", textAlign: "left",
};
const rowPlanned: React.CSSProperties = { borderStyle: "dashed", background: "var(--surface-2)" };
