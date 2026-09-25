"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Company, Entry, Settings, rawMinutes } from "@/lib/earnings";

const DEFAULT_SETTINGS: Settings = {
  gross_rate: 8.98,
  rounding: "none",
  piz_pct: 13.95,
  pdo_pct: 0.9,
  akontacija_pct: 22.5,
  akontacija_threshold: 400,
  annual_allowance: 3886.35,
  locale: "en",
};

export function useData() {
  const supabase = createClient();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: e }, { data: s }, { data: c }] = await Promise.all([
      supabase.from("entries").select("*").order("work_date", { ascending: false }),
      supabase.from("settings").select("*").single(),
      supabase.from("companies").select("*").order("created_at"),
    ]);
    if (e) setEntries(e as Entry[]);
    if (s) setSettings(s as Settings);
    if (c) setCompanies(c as Company[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.is_anonymous) {
        location.href = "/login";
        return;
      }
      if (!cancelled) load();
    }
    init();
    return () => { cancelled = true; };
  }, []);

  const ensureUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.is_anonymous) location.href = "/login";
    return user;
  }, [supabase]);

  const saveEntry = useCallback(
    async (entry: Partial<Entry>) => {
      const crosses =
        !!entry.end_time &&
        !!entry.start_time &&
        rawMinutesCrosses(entry.start_time, entry.end_time);
      const payload = { ...entry, crosses_midnight: crosses };
      if (entry.id) {
        const { error: e } = await supabase.from("entries").update(payload).eq("id", entry.id);
        if (e) { setError(`Update failed: ${e.message}`); return; }
      } else {
        const user = await ensureUser();
        const { error: e } = await supabase
          .from("entries")
          .insert({ ...payload, user_id: user?.id });
        if (e) { setError(`Insert failed: ${e.message} (user: ${user?.id ?? "none"})`); return; }
      }
      setError(null);
      await load();
    },
    [supabase, load, ensureUser]
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      await supabase.from("entries").delete().eq("id", id);
      await load();
    },
    [supabase, load]
  );

  const saveSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const next = { ...settings, ...patch };
      setSettings(next);
      const user = await ensureUser();
      await supabase.from("settings").update(patch).eq("user_id", user?.id);
    },
    [supabase, settings, ensureUser]
  );

  const saveCompany = useCallback(
    async (company: Partial<Company>) => {
      if (company.id) {
        await supabase.from("companies").update(company).eq("id", company.id);
      } else {
        const user = await ensureUser();
        await supabase.from("companies").insert({ ...company, user_id: user?.id });
      }
      await load();
    },
    [supabase, load, ensureUser]
  );

  const deleteCompany = useCallback(
    async (id: string) => {
      await supabase.from("companies").delete().eq("id", id);
      await load();
    },
    [supabase, load]
  );

  return {
    entries,
    settings,
    companies,
    loading,
    error,
    saveEntry,
    deleteEntry,
    saveSettings,
    saveCompany,
    deleteCompany,
    reload: load,
  };
}

function rawMinutesCrosses(start: string, end: string): boolean {
  return rawMinutes(start, end) > 0 && end < start;
}
