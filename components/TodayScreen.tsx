"use client";

import { useEffect, useState } from "react";
import { Company, Entry, Settings, netBeforeTax, eur, fmtHours, entryHours, rawMinutes, isDone } from "@/lib/earnings";
import { Locale, tr } from "@/lib/i18n";
import { localISO, weekRange } from "@/lib/dates";
import EntryEditor from "./EntryEditor";
import QuickAdd from "./QuickAdd";

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

  const weekHours = weekEntries.filter(isDone).reduce((s, e) => s + entryHours(e, settings), 0);
  const todayNet = netBeforeTax(todays, settings, companies);
  const [quick, setQuick] = useState(false);

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
      {/* This week — the one number that matters */}
      <div style={weekCard}>
        <span style={weekLabel}>{L("thisWeek")}</span>
        <span className="figure" style={{ fontSize: 44, lineHeight: 1.05, marginTop: 6 }}>{eur(weekNet, locale)}</span>
        <span style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>{fmtHours(weekHours)}</span>
        <div style={weekDivider} />
        <span style={{ fontSize: 15, fontWeight: 600 }}>
          {L("today")} · <span className="figure">{eur(todayNet, locale)}</span>
        </span>
      </div>

      {running ? (
        <>
          {/* Working: live block with End now inside */}
          <div style={liveCard} role="status" aria-live="polite">
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              <PulseDot /> {L("working")}
            </span>
            <span className="figure" style={{ fontSize: 40, lineHeight: 1, marginTop: 10 }}>
              {fmtHours(rawMinutes(running.start_time, nowTime()) / 60)}
            </span>
            <span style={{ fontSize: 15, fontWeight: 600, marginTop: 6 }}>
              {eur(netBeforeTax([{ ...running, end_time: nowTime() }], settings, companies), locale)} {L("earned")}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.65, marginTop: 2 }}>
              {L("runningSince")} {running.start_time?.slice(0, 5)}
            </span>
            <button onClick={endNow} style={endBtn}>■ {L("endNow")}</button>
          </div>
          <button onClick={() => setQuick(true)} style={secondaryBtn}>+ {L("addHoursManually")}</button>
        </>
      ) : (
        <>
          <button onClick={() => setQuick(true)} style={addHoursBtn}>+ {L("addHours")}</button>
          <button onClick={startNow} style={startBtn}>▶ {L("startNow")}</button>
        </>
      )}

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

      {quick && (
        <QuickAdd
          settings={settings}
          companies={companies}
          defaultDate={today}
          fallbackCompanyId={lastCompanyId}
          locale={locale}
          onSave={onSave}
          onMore={(draft) => { setQuick(false); setEditing(draft); }}
          onClose={() => setQuick(false)}
        />
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
            : entry.duration_minutes != null
            ? `⏱ ${fmtHours(entry.duration_minutes / 60)}`
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
            <span className="figure" style={{ fontSize: 15, color: "var(--active)" }}>{fmtHours(rawMinutes(entry.start_time, live!.end_time) / 60)}</span>
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
  return <span aria-hidden style={{ display: "inline-block", width: 10, height: 10, borderRadius: 5, background: "currentColor", animation: "live-pulse 1.6s ease-in-out infinite" }} />;
}

const weekCard: React.CSSProperties = {
  background: "var(--grad)", color: "#fff", borderRadius: "var(--radius)",
  padding: "20px 22px 18px", display: "flex", flexDirection: "column",
  boxShadow: "0 12px 40px rgba(224,55,155,0.25)",
};
const weekLabel: React.CSSProperties = { fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.85 };
const weekDivider: React.CSSProperties = { height: 1, background: "rgba(255,255,255,0.22)", margin: "14px 0 12px" };
const addHoursBtn: React.CSSProperties = {
  width: "100%", marginTop: 18, padding: 18, borderRadius: "var(--radius)", border: "none",
  background: "var(--text)", color: "var(--paper)", fontSize: 17, fontWeight: 700,
};
const startBtn: React.CSSProperties = {
  display: "block", margin: "12px auto 0", padding: "10px 22px", borderRadius: 999,
  border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text-soft)", fontSize: 14, fontWeight: 600,
};
const liveCard: React.CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center", marginTop: 18,
  padding: "18px 16px 16px", borderRadius: "var(--radius)",
  background: "var(--active-grad)", color: "var(--on-bright)",
  animation: "live-glow 2.4s ease-in-out infinite",
};
const endBtn: React.CSSProperties = {
  marginTop: 14, padding: "10px 26px", borderRadius: 999,
  border: "1.5px solid rgba(12,10,29,0.35)", background: "rgba(12,10,29,0.12)",
  color: "var(--on-bright)", fontSize: 15, fontWeight: 700,
};
const secondaryBtn: React.CSSProperties = {
  width: "100%", padding: 13, borderRadius: "var(--radius-sm)", border: "1px solid var(--line)",
  background: "var(--surface)", color: "var(--text)", fontSize: 15, fontWeight: 600, marginTop: 12,
};
const guard: React.CSSProperties = {
  background: "var(--danger-100)", color: "var(--danger)", padding: "12px 14px",
  borderRadius: "var(--radius-sm)", marginTop: 14, fontSize: 14, fontWeight: 500,
  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
};
const guardBtn: React.CSSProperties = {
  border: "none", background: "var(--danger)", color: "var(--on-bright)", padding: "6px 12px",
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
