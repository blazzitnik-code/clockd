"use client";

import { useState } from "react";
import { Entry, Settings, entryHours } from "@/lib/earnings";
import { Locale, tr, siHolidays, t } from "@/lib/i18n";
import { localISO, monthGrid, addMonths, isSameMonth, isSameDay, format } from "@/lib/dates";
import EntryEditor from "./EntryEditor";
import { EntryRow } from "./TodayScreen";

interface Props {
  entries: Entry[];
  settings: Settings;
  onSave: (e: Partial<Entry>) => void;
  onDelete: (id: string) => void;
}

export default function CalendarScreen({ entries, settings, onSave, onDelete }: Props) {
  const locale = settings.locale as Locale;
  const L = (k: Parameters<typeof tr>[0]) => tr(k, locale);
  const [ref, setRef] = useState(new Date());
  const [selected, setSelected] = useState<string>(localISO(new Date()));
  const [editing, setEditing] = useState<Partial<Entry> | null>(null);

  const grid = monthGrid(ref);
  const holidays = siHolidays(ref.getFullYear());
  const dayNames = t.dayShort[locale];

  // index entries by date
  const byDate = new Map<string, Entry[]>();
  for (const e of entries) {
    const arr = byDate.get(e.work_date) || [];
    arr.push(e);
    byDate.set(e.work_date, arr);
  }

  const selectedEntries = byDate.get(selected) || [];

  return (
    <div style={{ padding: "20px 18px 100px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <button onClick={() => setRef(addMonths(ref, -1))} style={navBtn}>‹</button>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
          {format(ref, "LLLL yyyy")}
        </h2>
        <button onClick={() => setRef(addMonths(ref, 1))} style={navBtn}>›</button>
      </div>

      {/* weekday header */}
      <div style={gridStyle}>
        {dayNames.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--text-faint)", padding: "4px 0" }}>
            {d}
          </div>
        ))}
      </div>

      {/* day cells */}
      <div style={gridStyle}>
        {grid.map((day) => {
          const iso = localISO(day);
          const dayEntries = byDate.get(iso) || [];
          const hasWorked = dayEntries.some((e) => e.status === "worked");
          const hasPlanned = dayEntries.some((e) => e.status === "planned") && !hasWorked;
          const holiday = holidays[iso];
          const dim = !isSameMonth(day, ref);
          const isSel = iso === selected;
          const isToday = isSameDay(day, new Date());

          const cls = hasWorked ? "cell-worked" : hasPlanned ? "cell-planned" : "";

          return (
            <button
              key={iso}
              onClick={() => setSelected(iso)}
              className={cls}
              style={{
                aspectRatio: "1",
                borderRadius: 10,
                border: isSel ? "2px solid var(--ink)" : cls === "cell-planned" ? undefined : "1px solid transparent",
                boxShadow: isToday ? "0 0 0 2px var(--paper), 0 0 0 4px var(--sage)" : undefined,
                background: cls ? undefined : dim ? "transparent" : "var(--surface)",
                color: cls ? undefined : dim ? "var(--text-faint)" : isToday ? "var(--sage)" : "var(--text)",
                fontSize: 14,
                fontWeight: isToday ? 700 : 500,
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: dim ? (cls ? 0.75 : 0.45) : 1,
              }}
              title={holiday ? holiday[locale] : undefined}
            >
              {day.getDate()}
              {holiday && (
                <span className="cell-holiday-dot" style={{ position: "absolute", bottom: 5, width: 4, height: 4, borderRadius: 2 }} />
              )}
            </button>
          );
        })}
      </div>

      {/* legend */}
      <div style={legend}>
        <Legend swatchClass="cell-worked" label={L("worked")} />
        <Legend swatchClass="cell-planned" label={L("planned")} />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-soft)" }}>
          <span style={{ width: 12, height: 12, borderRadius: 4, boxShadow: "0 0 0 2px var(--sage)" }} /> {L("today_")}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-soft)" }}>
          <span className="cell-holiday-dot" style={{ width: 7, height: 7, borderRadius: 4 }} /> {locale === "sl" ? "Praznik" : "Holiday"}
        </span>
      </div>

      {/* selected day detail */}
      <div style={{ marginTop: 22, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
          {format(new Date(selected + "T00:00:00"), "EEEE, d LLL")}
        </h3>
        <button onClick={() => setEditing({ work_date: selected })} style={addDayBtn}>+ {L("addEntry")}</button>
      </div>
      {holidays[selected] && (
        <p style={{ fontSize: 13, color: "var(--clay)", margin: "8px 0 0" }}>● {holidays[selected][locale]}</p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
        {selectedEntries.length === 0 ? (
          <p style={{ color: "var(--text-faint)", fontSize: 14 }}>—</p>
        ) : (
          selectedEntries.map((e) => (
            <div key={e.id}>
              <EntryRow entry={e} settings={settings} locale={locale} onClick={() => setEditing(e)} />
              {e.status === "planned" && (
                <button onClick={() => onSave({ ...e, status: "worked" })} style={confirmBtn}>
                  ✓ {L("confirmWorked")}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {editing && (
        <EntryEditor
          initial={editing}
          defaultDate={selected}
          locale={locale}
          onSave={onSave}
          onDelete={onDelete}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function Legend({ swatchClass, label }: { swatchClass: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-soft)" }}>
      <span className={swatchClass} style={{ width: 14, height: 14, borderRadius: 4 }} /> {label}
    </span>
  );
}

const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5 };
const navBtn: React.CSSProperties = { border: "1px solid var(--line)", background: "var(--surface)", width: 36, height: 36, borderRadius: 10, fontSize: 18, color: "var(--text)" };
const legend: React.CSSProperties = { display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" };
const addDayBtn: React.CSSProperties = { border: "none", background: "var(--ink-100)", color: "var(--ink)", padding: "7px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600 };
const confirmBtn: React.CSSProperties = { border: "none", background: "var(--sage-100)", color: "var(--sage)", padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, marginTop: 6, width: "100%" };
