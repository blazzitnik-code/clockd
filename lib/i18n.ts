// Bilingual strings (en/sl) + Slovenian public holidays.

export type Locale = "en" | "sl";

export const t = {
  appName: { en: "Clockd", sl: "Clockd" },
  // nav
  today: { en: "Today", sl: "Danes" },
  calendar: { en: "Calendar", sl: "Koledar" },
  earnings: { en: "Earnings", sl: "Zaslužek" },
  money: { en: "Money", sl: "Denar" },
  settings: { en: "Settings", sl: "Nastavitve" },
  // clocking
  startNow: { en: "Start now", sl: "Začni zdaj" },
  endNow: { en: "End now", sl: "Končaj zdaj" },
  running: { en: "Running", sl: "V teku" },
  stillWorking: { en: "Still working?", sl: "Še delaš?" },
  addEntry: { en: "Add entry", sl: "Dodaj vnos" },
  editEntry: { en: "Edit entry", sl: "Uredi vnos" },
  manualEntry: { en: "Manual entry", sl: "Ročni vnos" },
  start: { en: "Start", sl: "Začetek" },
  end: { en: "End", sl: "Konec" },
  label: { en: "Label", sl: "Oznaka" },
  labelHint: { en: "e.g. Morning, Afternoon", sl: "npr. Jutro, Popoldne" },
  date: { en: "Date", sl: "Datum" },
  save: { en: "Save", sl: "Shrani" },
  cancel: { en: "Cancel", sl: "Prekliči" },
  delete: { en: "Delete", sl: "Izbriši" },
  worked: { en: "Worked", sl: "Opravljeno" },
  planned: { en: "Planned", sl: "Načrtovano" },
  overnight: { en: "Crosses midnight", sl: "Čez polnoč" },
  confirmWorked: { en: "Confirm as worked", sl: "Potrdi kot opravljeno" },
  // earnings
  net: { en: "Net", sl: "Neto" },
  gross: { en: "Gross", sl: "Bruto" },
  hours: { en: "Hours", sl: "Ure" },
  thisWeek: { en: "This week", sl: "Ta teden" },
  thisMonth: { en: "This month", sl: "Ta mesec" },
  month: { en: "Month", sl: "Mesec" },
  year: { en: "Year", sl: "Leto" },
  byMonth: { en: "By month", sl: "Po mesecih" },
  noEntriesYear: { en: "Nothing logged this year yet.", sl: "Letos še ni vnosov." },
  today_: { en: "Today", sl: "Danes" },
  soFar: { en: "so far", sl: "do zdaj" },
  netLabel: { en: "Net", sl: "Neto" },
  advanceWithheld: { en: "advance withheld", sl: "akontacija" },
  paidOut: { en: "paid out", sl: "izplačilo" },
  advanceHint: {
    en: "Monthly gross over the threshold, so the payer withholds a tax advance. It's usually refunded at annual assessment.",
    sl: "Mesečni bruto nad pragom, zato izplačevalec odtegne akontacijo. Ob letni odmeri se praviloma vrne.",
  },
  logged: { en: "logged", sl: "zabeleženo" },
  earnedToday: { en: "earned today", sl: "zasluženo danes" },
  earnedOn: { en: "earned on", sl: "zasluženo" },
  netEarnings: { en: "Your net earnings", sl: "Vaš neto zaslužek" },
  netBeforeTax: { en: "Net before income tax", sl: "Neto pred dohodnino" },
  grossEarnings: { en: "Gross earnings", sl: "Bruto zaslužek" },
  piz: { en: "PIZ contribution", sl: "PIZ prispevek" },
  pdo: { en: "PDO contribution", sl: "PDO prispevek" },
  incomeTaxAdvance: { en: "Income tax advance", sl: "Dohodnina akontacija" },
  akontacija: { en: "Advance", sl: "Akontacija" },
  netAfterTax: { en: "Net after advance", sl: "Neto po akontaciji" },
  ofGross: { en: "of gross", sl: "od bruto" },
  showBreakdown: { en: "Show breakdown", sl: "Prikaži razčlenitev" },
  hideBreakdown: { en: "Hide breakdown", sl: "Skrij razčlenitev" },
  worstCaseNote: {
    en: "The advance is often refunded at annual assessment. This is your worst-case take-home.",
    sl: "Akontacija se pogosto vrne ob letni odmeri. To je vaše najnižje možno izplačilo.",
  },
  // allowance
  annualAllowance: { en: "Annual tax-free allowance", sl: "Letna olajšava" },
  allowanceUsed: { en: "used this year", sl: "porabljeno letos" },
  allowanceNearLimit: {
    en: "You're close to your tax-free limit.",
    sl: "Bližate se meji oprostitve dohodnine.",
  },
  allowanceOverLimit: {
    en: "You've passed your tax-free limit for the year.",
    sl: "Presegli ste letno mejo oprostitve dohodnine.",
  },
  // settings
  hourlyRate: { en: "Gross hourly rate", sl: "Bruto urna postavka" },
  rounding: { en: "Rounding", sl: "Zaokroževanje" },
  roundingNone: { en: "None", sl: "Brez" },
  rounding15: { en: "15 min", sl: "15 min" },
  rounding30: { en: "30 min", sl: "30 min" },
  taxConfig: { en: "Tax configuration", sl: "Davčne nastavitve" },
  taxConfigNote: {
    en: "Pre-filled with 2026 Slovenian student-work values. Edit if the law changes.",
    sl: "Vnaprej izpolnjeno z vrednostmi za študentsko delo 2026. Uredite ob spremembi zakona.",
  },
  language: { en: "Language", sl: "Jezik" },
  export: { en: "Export", sl: "Izvoz" },
  exportCsv: { en: "Export CSV", sl: "Izvozi CSV" },
  exportPdf: { en: "Export PDF", sl: "Izvozi PDF" },
  signOut: { en: "Sign out", sl: "Odjava" },
  // companies
  company: { en: "Company", sl: "Podjetje" },
  companies: { en: "Companies", sl: "Podjetja" },
  addCompany: { en: "Add company", sl: "Dodaj podjetje" },
  companyName: { en: "Company name", sl: "Ime podjetja" },
  rateOptional: { en: "Rate €/h (leave empty if not hourly)", sl: "Urna postavka €/h (pusti prazno, če ni urno)" },
  noCompany: { en: "No company", sl: "Brez podjetja" },
  // entry mode
  byHours: { en: "By hours", sl: "Po urah" },
  manualAmount: { en: "Manual amount", sl: "Ročni znesek" },
  grossAmount: { en: "Gross amount (€)", sl: "Bruto znesek (€)" },
  netAmount: { en: "Net amount (€)", sl: "Neto znesek (€)" },
  // auth
  signIn: { en: "Sign in", sl: "Prijava" },
  emailLabel: { en: "Email", sl: "E-pošta" },
  sendLink: { en: "Send magic link", sl: "Pošlji povezavo" },
  checkEmail: {
    en: "Check your email for the sign-in link.",
    sl: "Preverite e-pošto za prijavno povezavo.",
  },
  signInTagline: {
    en: "Track your hours. See what you really earn.",
    sl: "Beleži ure. Poglej, koliko zares zaslužiš.",
  },
  // empty states
  noEntriesToday: {
    en: "No hours logged today. Start the clock or add them by hand.",
    sl: "Danes ni vnosov. Zaženi uro ali jih vnesi ročno.",
  },
  noEntriesMonth: {
    en: "Nothing logged this month yet.",
    sl: "Ta mesec še ni vnosov.",
  },
  // misc
  monday: { en: "Mon", sl: "Pon" },
  dayShort: {
    en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    sl: ["Pon", "Tor", "Sre", "Čet", "Pet", "Sob", "Ned"],
  },
} as const;

type StringKeys = {
  [K in keyof typeof t]: (typeof t)[K]["en"] extends string ? K : never;
}[keyof typeof t];

export function tr(key: StringKeys, locale: Locale): string {
  return t[key][locale] as string;
}

// Slovenian public holidays (work-free days). Visual markers only.
// Fixed-date holidays + computed Easter Monday.
function easterSunday(year: number): Date {
  // Anonymous Gregorian algorithm
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function siHolidays(year: number): Record<string, { en: string; sl: string }> {
  const easter = easterSunday(year);
  const easterMon = new Date(easter);
  easterMon.setDate(easter.getDate() + 1);
  const pentecost = new Date(easter);
  pentecost.setDate(easter.getDate() + 49);

  const map: Record<string, { en: string; sl: string }> = {
    [`${year}-01-01`]: { en: "New Year's Day", sl: "Novo leto" },
    [`${year}-01-02`]: { en: "New Year holiday", sl: "Novo leto" },
    [`${year}-02-08`]: { en: "Prešeren Day", sl: "Prešernov dan" },
    [iso(easterMon)]: { en: "Easter Monday", sl: "Velikonočni ponedeljek" },
    [`${year}-04-27`]: { en: "Day of Uprising", sl: "Dan upora proti okupatorju" },
    [`${year}-05-01`]: { en: "Labour Day", sl: "Praznik dela" },
    [`${year}-05-02`]: { en: "Labour Day", sl: "Praznik dela" },
    [iso(pentecost)]: { en: "Whit Sunday", sl: "Binkošti" },
    [`${year}-06-25`]: { en: "Statehood Day", sl: "Dan državnosti" },
    [`${year}-08-15`]: { en: "Assumption Day", sl: "Marijino vnebovzetje" },
    [`${year}-10-31`]: { en: "Reformation Day", sl: "Dan reformacije" },
    [`${year}-11-01`]: { en: "All Saints' Day", sl: "Dan spomina na mrtve" },
    [`${year}-12-25`]: { en: "Christmas Day", sl: "Božič" },
    [`${year}-12-26`]: { en: "Independence Day", sl: "Dan samostojnosti" },
  };
  return map;
}
