"use client";

import { useEffect, useState } from "react";
import { useData } from "@/lib/useData";
import { Locale, tr } from "@/lib/i18n";
import { Entry, entryHours, eur, fmtHours, isDone, netBeforeTax } from "@/lib/earnings";
import { localISO } from "@/lib/dates";
import Wordmark from "./Wordmark";
import TodayScreen from "./TodayScreen";
import CalendarScreen from "./CalendarScreen";
import EarningsScreen from "./EarningsScreen";
import SettingsScreen from "./SettingsScreen";

type Tab = "today" | "calendar" | "earnings" | "settings";

export default function AppShell() {
  const { entries, settings, companies, loading, error, saveEntry, deleteEntry, saveSettings, saveCompany, deleteCompany, saveRate, deleteRate } = useData();
  const [tab, setTab] = useState<Tab>("today");
  const locale = settings.locale as Locale;
  const L = (k: Parameters<typeof tr>[0]) => tr(k, locale);
  const [toast, setToast] = useState<{ hours: string; money: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  // Save wrapper: celebrate whenever an entry becomes a finished, worked block —
  // stopping the timer, a manual entry, or confirming a planned shift.
  async function handleSave(patch: Partial<Entry>) {
    const prev = patch.id ? entries.find((x) => x.id === patch.id) : undefined;
    const next = { ...prev, ...patch } as Entry;
    const done = (e?: Entry) => !!e && isDone(e);
    const finished = done(next);
    const wasFinished = done(prev);
    await saveEntry(patch);
    if (!finished || wasFinished) return;

    const sameDay = entries.filter(
      (x) => x.work_date === next.work_date && x.id !== next.id && done(x)
    );
    const dayNet = netBeforeTax([...sameDay, next], settings, companies);
    const entryNet = netBeforeTax([next], settings, companies);
    const isManual = next.gross_override != null || next.net_override != null;
    const isToday = next.work_date === localISO(new Date());
    const dayLabel = new Date(next.work_date + "T00:00:00").toLocaleDateString(
      locale === "sl" ? "sl-SI" : "en-GB", { day: "numeric", month: "short" }
    );
    setToast({
      hours: `${isManual ? eur(entryNet, locale) : fmtHours(entryHours(next, settings))} ${L("logged")} 🎉`,
      money: `${eur(dayNet, locale)} ${isToday ? L("earnedToday") : `${L("earnedOn")} ${dayLabel}`}`,
    });
  }

  const todayLabel = new Date().toLocaleDateString(locale === "sl" ? "sl-SI" : "en-GB", {
    weekday: "short", day: "numeric", month: "short",
  });

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-faint)" }}>
        …
      </div>
    );
  }

  return (
    <>
    {error && (
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, background: "#b91c1c", color: "#fff", padding: "10px 16px", fontSize: 13, zIndex: 999, fontFamily: "monospace" }}>
        {error}
      </div>
    )}
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100dvh", position: "relative" }}>
      <header style={topBar}>
        <Wordmark size={22} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-soft)" }}>{todayLabel}</span>
      </header>

      {tab === "today" && <TodayScreen entries={entries} settings={settings} companies={companies} onSave={handleSave} onDelete={deleteEntry} />}
      {tab === "calendar" && <CalendarScreen entries={entries} settings={settings} companies={companies} onSave={handleSave} onDelete={deleteEntry} />}
      {tab === "earnings" && <EarningsScreen entries={entries} settings={settings} companies={companies} />}
      {tab === "settings" && <SettingsScreen entries={entries} settings={settings} companies={companies} onSave={saveSettings} onSaveCompany={saveCompany} onDeleteCompany={deleteCompany} onSaveRate={saveRate} onDeleteRate={deleteRate} />}

      <nav style={navBar}>
        <TabBtn active={tab === "today"} onClick={() => setTab("today")} label={L("today")} icon={<ClockIcon />} />
        <TabBtn active={tab === "calendar"} onClick={() => setTab("calendar")} label={L("calendar")} icon={<CalIcon />} />
        <TabBtn active={tab === "earnings"} onClick={() => setTab("earnings")} label={L("money")} icon={<CoinIcon />} />
        <TabBtn active={tab === "settings"} onClick={() => setTab("settings")} label={L("settings")} icon={<GearIcon />} />
      </nav>

      {toast && (
        <div role="status" aria-live="polite" style={toastBox} onClick={() => setToast(null)}>
          <span style={{ fontSize: 17, fontWeight: 700 }}>{toast.hours}</span>
          <span className="figure" style={{ fontSize: 15, fontWeight: 600, color: "var(--money)" }}>{toast.money}</span>
        </div>
      )}
    </div>
    </>
  );
}

function TabBtn({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, border: "none", background: "transparent",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
      padding: "8px 0", color: active ? "var(--active)" : "var(--text-faint)",
      fontSize: 11, fontWeight: 600,
    }}>
      {icon}
      {label}
    </button>
  );
}

const topBar: React.CSSProperties = {
  position: "sticky", top: 0, zIndex: 20,
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "calc(12px + env(safe-area-inset-top)) 18px 12px",
  background: "rgba(12,10,29,0.85)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
  borderBottom: "1px solid var(--line)",
};

const toastBox: React.CSSProperties = {
  position: "fixed", left: 16, right: 16, bottom: "calc(84px + env(safe-area-inset-bottom))",
  maxWidth: 448, margin: "0 auto", zIndex: 40,
  display: "flex", flexDirection: "column", gap: 4,
  padding: "16px 18px", borderRadius: "var(--radius)",
  background: "var(--surface-2)", border: "1px solid var(--ink)",
  boxShadow: "0 10px 40px rgba(224,55,155,0.35)",
  animation: "toast-in 0.35s cubic-bezier(.2,.9,.3,1.3)",
};

const navBar: React.CSSProperties = {
  position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 480, margin: "0 auto",
  display: "flex", background: "var(--surface)", borderTop: "1px solid var(--line)",
  paddingBottom: "env(safe-area-inset-bottom)",
};

function ClockIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2" strokeLinecap="round"/></svg>; }
function CalIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4" strokeLinecap="round"/></svg>; }
function CoinIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.7-1.5-3-1.5-1.6 0-3 .9-3 2s1.4 2 3 2 3 .9 3 2-1.4 2-3 2c-1.3 0-2.5-.5-3-1.5M12 6.5v11" strokeLinecap="round"/></svg>; }
function GearIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" strokeLinecap="round"/></svg>; }
