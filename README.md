# Clockd — Your time. Your money.

Track shifts, see real net earnings (Slovenian student-work model), plan ahead on a calendar. Next.js 16 + Supabase. Same stack as Only3.

## What it does

- **Today** — `Start now` / `End now` shortcuts + manual entry. Multiple entries per day (split shifts / breaks). Forgot-to-stop guard on sessions running >14h.
- **Calendar** — Monday-first month grid. Worked = solid fill, Planned = ghosted/hatched, Slovenian public holidays marked. Tap a day to add/edit; convert planned -> worked with one tap.
- **Earnings** — Week and month views. Day/week show **net only** (gross - PIZ - PDO). Month shows the full expandable breakdown card: Gross -> PIZ -> PDO -> Net before tax -> (if month gross > 400 EUR) Akontacija -> Net after advance. Annual tax-free allowance progress bar (3,886.35 EUR default) with near/over-limit alerts.
- **Settings** — Gross hourly rate, rounding (none / 15 / 30 min), all tax numbers (PIZ %, PDO %, akontacija % + 400 EUR threshold, annual allowance) pre-filled and editable, EN/SL language toggle, CSV + PDF export, sign out.

All earnings figures verified against the reference payslip card to the cent.

## Setup

1. **Create a Supabase project** at supabase.com.
2. **Run the schema:** open the SQL editor, paste `supabase-schema.sql`, run it. Creates the `entries` and `settings` tables, row-level security (each user sees only their own data), and a trigger that auto-creates a settings row on signup.
3. **Enable email auth:** Authentication -> Providers -> Email (magic link on by default). Add your deploy URL to the redirect allowlist.
4. **Env vars:** copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase -> Settings -> API).
5. **Run locally:** `npm install && npm run dev` -> http://localhost:3000

## Deploy (Vercel)

1. Push to GitHub, import into Vercel.
2. Add the two env vars in Vercel project settings.
3. In Supabase Auth -> URL config, add `https://your-app.vercel.app/auth/callback` to redirect URLs.

## Tax defaults (Slovenia, 2026)

Pre-filled, editable in Settings so the app survives annual legal changes:
- PIZ (pension/disability): 13.95%
- PDO (long-term care): 0.90%
- Income-tax advance (akontacija): 22.5% of gross, triggered above 400 EUR/month
- Annual tax-free allowance: 3,886.35 EUR
- Min. gross rate reference: 8.98 EUR/h

"Net after advance" is labelled as worst-case take-home, since the advance is commonly refunded at annual assessment.

## Notes

- Overnight shifts (e.g. 22:00-02:00) count to their **start** date and are flagged automatically.
- PDF export uses the browser print dialog (works on mobile, no heavy dependency).
- Planned entries never count toward earnings until confirmed as worked.
