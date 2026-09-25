// Export helpers — CSV and a print-to-PDF window.
import { Company, Entry, Settings, entryHours, computeBreakdown, eur, fmtHours, isDone } from "./earnings";
import { tr, Locale } from "./i18n";

export function exportCsv(entries: Entry[], settings: Settings, locale: Locale, companies: Company[] = []) {
  const worked = entries.filter(isDone);
  const rows = [
    ["Date", "Start", "End", "Overnight", "Label", "Hours", "Gross (EUR)", "Net before tax (EUR)"],
  ];
  for (const e of worked) {
    const h = entryHours(e, settings);
    const b = computeBreakdown([e], settings, companies);
    const gross = b.gross;
    rows.push([
      e.work_date,
      (e.start_time || "").slice(0, 5),
      (e.end_time || "").slice(0, 5),
      e.crosses_midnight ? "yes" : "",
      e.label || "",
      h.toFixed(2),
      gross.toFixed(2),
      b.netBeforeTax.toFixed(2),
    ]);
  }
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  download(blob, `hours-${new Date().toISOString().slice(0, 10)}.csv`);
}

// PDF via the browser's print dialog — no heavy dependency, works on mobile.
export function exportPdf(entries: Entry[], settings: Settings, locale: Locale, title: string, companies: Company[] = []) {
  const worked = entries.filter(isDone);
  const b = computeBreakdown(worked, settings, companies);
  const L = (k: Parameters<typeof tr>[0]) => tr(k, locale);

  const rowsHtml = worked
    .map((e) => {
      const h = entryHours(e, settings);
      return `<tr>
        <td>${e.work_date}</td>
        <td>${e.start_time ? `${e.start_time.slice(0, 5)}–${(e.end_time || "").slice(0, 5)}${e.crosses_midnight ? " ⁺" : ""}` : ""}</td>
        <td>${e.label || ""}</td>
        <td style="text-align:right">${fmtHours(h)}</td>
        <td style="text-align:right">${eur(computeBreakdown([e], settings, companies).gross, locale)}</td>
      </tr>`;
    })
    .join("");

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>
      body{font-family:system-ui,sans-serif;color:#1a1d24;padding:32px;max-width:680px;margin:0 auto}
      h1{font-size:20px;margin:0 0 4px}
      .sub{color:#5b6170;margin:0 0 24px;font-size:13px}
      table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px}
      th,td{padding:8px 6px;border-bottom:1px solid #e8e4db;text-align:left}
      th{color:#5b6170;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
      .break{background:#f6f4ef;border-radius:12px;padding:16px 18px}
      .break .r{display:flex;justify-content:space-between;padding:6px 0;font-size:14px}
      .break .total{border-top:1px solid #ccc;margin-top:6px;padding-top:10px;font-weight:700}
    </style></head><body>
    <h1>${title}</h1>
    <p class="sub">${L("appName")} · ${worked.length} ${L("worked").toLowerCase()} · ${fmtHours(b.hours)}</p>
    <table><thead><tr>
      <th>${L("date")}</th><th>${L("start")}–${L("end")}</th><th>${L("label")}</th>
      <th style="text-align:right">${L("hours")}</th><th style="text-align:right">${L("gross")}</th>
    </tr></thead><tbody>${rowsHtml}</tbody></table>
    <div class="break">
      <div class="r"><span>${L("grossEarnings")}</span><span>${eur(b.gross, locale)}</span></div>
      <div class="r"><span>${L("piz")} (${settings.piz_pct}%)</span><span>− ${eur(b.piz, locale)}</span></div>
      ${settings.pdo_pct > 0 ? `<div class="r"><span>${L("pdo")} (${settings.pdo_pct}%)</span><span>− ${eur(b.pdo, locale)}</span></div>` : ""}
      <div class="r total"><span>${L("netBeforeTax")}</span><span>${eur(b.netBeforeTax, locale)}</span></div>
      ${b.akontacijaApplies ? `
      <div class="r"><span>${L("incomeTaxAdvance")} (${settings.akontacija_pct}% ${L("ofGross")})</span><span>− ${eur(b.akontacija, locale)}</span></div>
      <div class="r total"><span>${L("netAfterTax")}</span><span>${eur(b.netAfterTax, locale)}</span></div>` : ""}
    </div>
    <script>window.onload=()=>window.print()</script>
    </body></html>`);
  win.document.close();
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
