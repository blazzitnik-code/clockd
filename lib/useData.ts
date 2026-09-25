"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Company, CompanyRate, Entry, RATE_FROM_START, Settings, rawMinutes } from "@/lib/earnings";

const DEFAULT_SETTINGS: Settings = {
  gross_rate: 8.98,
  rounding: "none",
  piz_pct: 13.95,
  pdo_pct: 0, // students don't pay the long-term-care (PDO) contribution
  akontacija_pct: 22.5,
  akontacija_threshold: 400,
  annual_allowance: 3886.35,
  locale: "en",
  rate_type: "gross",
};

export function useData() {
  const supabase = createClient();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: e }, { data: s }, { data: c }, { data: r }] = await Promise.all([
      supabase.from("entries").select("*").order("work_date", { ascending: false }),
      supabase.from("settings").select("*").single(),
      supabase.from("companies").select("*").order("created_at"),
      supabase.from("company_rates").select("*").order("valid_from"),
    ]);
    if (e) setEntries(e as Entry[]);
    if (s) setSettings(s as Settings);
    if (c) {
      const rates = (r ?? []) as CompanyRate[];
      setCompanies(
        (c as Company[]).map((co) => ({ ...co, rates: rates.filter((x) => x.company_id === co.id) }))
      );
    }
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { rates, ...row } = company;
      if (row.id) {
        await supabase.from("companies").update(row).eq("id", row.id);
      } else {
        const user = await ensureUser();
        const { data: created, error: e } = await supabase
          .from("companies")
          .insert({ ...row, user_id: user?.id })
          .select()
          .single();
        if (e) { setError(`Company save failed: ${e.message}`); return; }
        // first rate of a new company applies from the start
        if (created && row.gross_rate != null) {
          await supabase.from("company_rates").insert({
            user_id: user?.id, company_id: created.id, gross_rate: row.gross_rate, valid_from: RATE_FROM_START,
          });
        }
      }
      await load();
    },
    [supabase, load, ensureUser]
  );

  // Keep companies.gross_rate equal to the most recent rate (used for labels
  // and as the "is hourly" flag).
  const syncCurrentRate = useCallback(
    async (companyId: string) => {
      const { data } = await supabase
        .from("company_rates").select("gross_rate").eq("company_id", companyId)
        .order("valid_from", { ascending: false }).limit(1);
      const current = data && data.length ? data[0].gross_rate : null;
      await supabase.from("companies").update({ gross_rate: current }).eq("id", companyId);
    },
    [supabase]
  );

  const saveRate = useCallback(
    async (rate: Partial<CompanyRate> & { company_id: string }) => {
      if (rate.id) {
        const { error: e } = await supabase.from("company_rates")
          .update({ gross_rate: rate.gross_rate, valid_from: rate.valid_from }).eq("id", rate.id);
        if (e) { setError(`Rate save failed: ${e.message}`); return; }
      } else {
        const user = await ensureUser();
        const { error: e } = await supabase.from("company_rates").insert({ ...rate, user_id: user?.id });
        if (e) { setError(`Rate save failed: ${e.message}`); return; }
      }
      await syncCurrentRate(rate.company_id);
      await load();
    },
    [supabase, load, ensureUser, syncCurrentRate]
  );

  const deleteRate = useCallback(
    async (rate: CompanyRate) => {
      await supabase.from("company_rates").delete().eq("id", rate.id);
      await syncCurrentRate(rate.company_id);
      await load();
    },
    [supabase, load, syncCurrentRate]
  );

  const deleteCompany = useCallback(
    async (id: string) => {
      // keep the entries, just detach them from the company
      const { error: e1 } = await supabase.from("entries").update({ company_id: null }).eq("company_id", id);
      if (e1) { setError(`Delete failed: ${e1.message}`); return; }
      const { error: e2 } = await supabase.from("companies").delete().eq("id", id);
      if (e2) { setError(`Delete failed: ${e2.message}`); return; }
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
    saveRate,
    deleteRate,
    reload: load,
  };
}

function rawMinutesCrosses(start: string, end: string): boolean {
  return rawMinutes(start, end) > 0 && end < start;
}
