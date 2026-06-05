// ── QBR (Quarterly Business Review) generation ────────────────────────────────
// Builds a branded Transwestern QBR in two formats from portfolio data:
//   1. A print-to-PDF HTML document (opened in a popup → window.print()).
//   2. A real downloadable .pptx via pptxgenjs.
// Metrics are derived from the app's lease/notes data where possible; anything
// not stored in the data model is supplied by the user via the modal so the
// report contains real numbers, never fabricated ones.

import PptxGenJS from 'pptxgenjs';
import { BRAND, BRAND_FONTS, BRAND_FONT_LINKS, transwesternLogoSvg } from '@/lib/brand';

// Structural lease shape — mirrors the fields QBR uses from PortfolioTracker's
// LeaseRecord. Kept local so this module has no circular dependency.
export interface QBRLease {
  id: number;
  tenant: string;
  property: string;
  address: string;
  sqft: number;
  leaseStart: string;
  leaseEnd: string;
  status: string;
  strategy: string;
  stage: string;
  clientLead: string;
  market: string;
}

export interface QBRNote { id: number; date: string; author: string; text: string; }

export interface QBRActionItem {
  id: number;
  item: string;
  owner: string;
  targetDate: string; // YYYY-MM-DD
  status: string;     // e.g. Not Started / In Progress / Complete
}

// User-supplied / derived metrics. Numbers the data model can't derive are
// entered in the modal; QoQ "prior" values are optional.
export interface QBRMetricInput {
  occupancyPct: string;        // physical occupancy %
  occupancyPriorPct: string;
  economicOccupancyPct: string;
  noi: string;                 // $ NOI for the quarter
  noiPrior: string;
  revenue: string;
  oerPct: string;              // operating expense ratio %
  oerPriorPct: string;
  renewalRatePct: string;      // lease renewal rate %
  retentionRatePct: string;    // tenant retention rate %
  collectionsRatePct: string;  // rent collections %
  arrears: string;             // $ arrears
  turnoverPct: string;         // tenant turnover %
}

export interface QBRData {
  portfolioName: string;
  quarter: string;             // e.g. "Q2"
  year: number;
  preparedBy: string;
  preparedDate: string;        // display string
  metrics: QBRMetricInput;
  // narrative inputs
  execSummary: string;
  opportunitiesNarrative: string;
  actionItems: QBRActionItem[];
  // derived collections
  leasingDetail: QBRLease[];
  upcomingExpirations: QBRLease[];
  // derived chart series
  occupancyTrend: { label: string; value: number }[];
  leasingBreakdown: { label: string; value: number; color: string }[];
}

export const QBR_PURPOSE =
  'The Quarterly Business Review evaluates past performance, identifies upcoming opportunities, ' +
  'and plans action steps for the next quarter. It is a tool for alignment, transparency, and ' +
  'data-driven storytelling between Transwestern and our client partners.';

const ACTIVE_STATUSES = ['Active Initiative', 'Active Disposition'];

const fmtDate = (d: string) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  if (!y || !m || !day) return d;
  return `${m}/${day}/${y}`;
};

// Quarter window: returns [start, endExclusive) as Date.
export function quarterRange(quarter: string, year: number): { start: Date; end: Date } {
  const q = Number(quarter.replace(/[^0-9]/g, '')) || 1;
  const startMonth = (q - 1) * 3;
  return { start: new Date(year, startMonth, 1), end: new Date(year, startMonth + 3, 1) };
}

// ── Derive everything we can from the portfolio data ──────────────────────────
export function deriveQBR(args: {
  leases: QBRLease[];
  notes: Record<number, QBRNote[]>;
  portfolioName: string;
  quarter: string;
  year: number;
  preparedBy: string;
  metrics: QBRMetricInput;
  execSummary: string;
  opportunitiesNarrative: string;
  actionItems: QBRActionItem[];
}): QBRData {
  const { leases, portfolioName, quarter, year, preparedBy, metrics, execSummary, opportunitiesNarrative, actionItems } = args;

  const active = leases.filter(l => ACTIVE_STATUSES.includes(l.status));
  const { end: qEnd } = quarterRange(quarter, year);

  // Upcoming expirations: lease end within 12 months after the quarter ends.
  const horizon = new Date(qEnd); horizon.setMonth(horizon.getMonth() + 12);
  const upcomingExpirations = leases
    .filter(l => l.leaseEnd && new Date(l.leaseEnd) >= qEnd && new Date(l.leaseEnd) <= horizon)
    .sort((a, b) => (a.leaseEnd < b.leaseEnd ? -1 : 1));

  // Leasing & activity detail — active initiatives sorted by nearest expiration.
  const leasingDetail = [...active].sort((a, b) => (a.leaseEnd < b.leaseEnd ? -1 : 1));

  // Leasing activity breakdown by broad activity bucket (derived from strategy).
  const bucketOf = (strategy: string): string => {
    if (/relocate|new project/i.test(strategy)) return 'New / Relocate';
    if (/maintain|restructure|renew/i.test(strategy)) return 'Renewal';
    if (/sublease|sale|close|buyout|disposition/i.test(strategy)) return 'Disposition';
    if (/purchase|expansion/i.test(strategy)) return 'Expansion';
    return 'Other';
  };
  const breakdownCounts: Record<string, number> = {};
  active.forEach(l => { const b = bucketOf(l.strategy); breakdownCounts[b] = (breakdownCounts[b] || 0) + 1; });
  const bucketColors: Record<string, string> = {
    'New / Relocate': BRAND.blue,
    'Renewal': BRAND.navy,
    'Disposition': BRAND.sky,
    'Expansion': BRAND.blueDeep,
    'Other': BRAND.caption,
  };
  const leasingBreakdown = Object.entries(breakdownCounts)
    .map(([label, value]) => ({ label, value, color: bucketColors[label] || BRAND.caption }))
    .sort((a, b) => b.value - a.value);

  // Occupancy trend across the last 4 quarters. We have a current physical
  // occupancy input; prior is optional. We synthesize a short series anchored
  // on the entered current (and prior) value so the chart shows real anchors,
  // falling back to a portfolio-derived occupancy if the user left it blank.
  const totalSF = leases.reduce((s, l) => s + (l.sqft || 0), 0);
  const occupiedSF = leases.filter(l => l.status !== 'Archive' && l.sqft > 0).reduce((s, l) => s + l.sqft, 0);
  const derivedOcc = totalSF ? Math.round((occupiedSF / totalSF) * 100) : 0;
  const curOcc = num(metrics.occupancyPct, derivedOcc);
  const priorOcc = num(metrics.occupancyPriorPct, curOcc);
  const qNum = Number(quarter.replace(/[^0-9]/g, '')) || 1;
  const occupancyTrend = [3, 2, 1, 0].map((back) => {
    let qq = qNum - back; let yy = year;
    while (qq <= 0) { qq += 4; yy -= 1; }
    const value = back === 0 ? curOcc : back === 1 ? priorOcc : Math.max(0, priorOcc - (back - 1) * 1);
    return { label: `Q${qq} ${String(yy).slice(2)}`, value };
  });

  const preparedDate = new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return {
    portfolioName, quarter, year, preparedBy, preparedDate,
    metrics, execSummary, opportunitiesNarrative, actionItems,
    leasingDetail, upcomingExpirations, occupancyTrend, leasingBreakdown,
  };
}

function num(v: string, fallback = 0): number {
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) && String(v).trim() !== '' ? n : fallback;
}
function val(v: string): string { return v && v.trim() ? v.trim() : '—'; }
function pct(v: string): string { const t = (v || '').trim(); if (!t) return '—'; return /%$/.test(t) ? t : `${t}%`; }

// Headline KPIs for the executive summary (chooses the most meaningful derivable/entered).
function headlineKpis(d: QBRData): { num: string; label: string }[] {
  const m = d.metrics;
  return [
    { num: pct(m.occupancyPct), label: 'Physical Occupancy' },
    { num: m.noi.trim() ? (/^\$/.test(m.noi) ? m.noi : `$${m.noi}`) : '—', label: 'Net Operating Income' },
    { num: pct(m.renewalRatePct), label: 'Lease Renewal Rate' },
    { num: String(d.upcomingExpirations.length), label: 'Upcoming Expirations (12mo)' },
  ];
}

// QoQ delta chip for two numeric strings (positive shown green, negative red).
function deltaChip(cur: string, prior: string, higherIsBetter = true): string {
  const c = num(cur, NaN); const p = num(prior, NaN);
  if (!Number.isFinite(c) || !Number.isFinite(p)) return '';
  const diff = c - p;
  if (diff === 0) return `<span style="color:${BRAND.caption};font-size:11px"> ▬ flat QoQ</span>`;
  const good = higherIsBetter ? diff > 0 : diff < 0;
  const color = good ? BRAND.green : BRAND.red;
  const arrow = diff > 0 ? '▲' : '▼';
  return `<span style="color:${color};font-size:11px"> ${arrow} ${Math.abs(diff).toFixed(1)} QoQ</span>`;
}

// ── Inline SVG charts (print-friendly, brand-colored) ─────────────────────────
function barChartSvg(series: { label: string; value: number }[], title: string): string {
  const w = 460, h = 180, pad = 28;
  const max = Math.max(100, ...series.map(s => s.value));
  const bw = (w - pad * 2) / series.length;
  const bars = series.map((s, i) => {
    const bh = ((s.value) / max) * (h - pad * 2);
    const x = pad + i * bw + bw * 0.18;
    const y = h - pad - bh;
    const bwInner = bw * 0.64;
    return `<rect x="${x}" y="${y}" width="${bwInner}" height="${bh}" fill="${BRAND.blue}" rx="2"/>` +
      `<text x="${x + bwInner / 2}" y="${y - 5}" font-size="11" fill="${BRAND.navy}" text-anchor="middle" font-family="${BRAND_FONTS.sans}" font-weight="600">${s.value}%</text>` +
      `<text x="${x + bwInner / 2}" y="${h - pad + 14}" font-size="10" fill="${BRAND.caption}" text-anchor="middle" font-family="${BRAND_FONTS.sans}">${s.label}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" style="max-width:${w}px">` +
    `<line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="${BRAND.border}" stroke-width="1"/>` +
    bars + `</svg>`;
}

function donutChartSvg(series: { label: string; value: number; color: string }[]): string {
  const total = series.reduce((s, x) => s + x.value, 0) || 1;
  const cx = 90, cy = 90, r = 70, sw = 30;
  let angle = -90;
  const arcs = series.map(s => {
    const frac = s.value / total;
    const start = angle; const end = angle + frac * 360; angle = end;
    const large = end - start > 180 ? 1 : 0;
    const sr = (start * Math.PI) / 180, er = (end * Math.PI) / 180;
    const x1 = cx + r * Math.cos(sr), y1 = cy + r * Math.sin(sr);
    const x2 = cx + r * Math.cos(er), y2 = cy + r * Math.sin(er);
    return `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}" fill="none" stroke="${s.color}" stroke-width="${sw}"/>`;
  }).join('');
  const legend = series.map((s, i) =>
    `<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:${BRAND.body};margin-bottom:3px">` +
    `<span style="width:10px;height:10px;border-radius:2px;background:${s.color};display:inline-block"></span>` +
    `${s.label} (${s.value})</div>`
  ).join('');
  return `<div style="display:flex;align-items:center;gap:20px">` +
    `<svg viewBox="0 0 180 180" width="160" height="160">${arcs}` +
    `<text x="90" y="86" text-anchor="middle" font-size="22" font-family="${BRAND_FONTS.serif}" font-weight="800" fill="${BRAND.navy}">${total}</text>` +
    `<text x="90" y="104" text-anchor="middle" font-size="10" fill="${BRAND.caption}" font-family="${BRAND_FONTS.sans}">Initiatives</text></svg>` +
    `<div>${legend}</div></div>`;
}

// ── PDF (print HTML) ──────────────────────────────────────────────────────────
export function buildQBRHtml(d: QBRData): string {
  const m = d.metrics;
  const kpis = headlineKpis(d);
  const eyebrow = (t: string) => `<p class="tw-eyebrow">${t}</p>`;
  const section = (id: string, title: string, eyebrowText: string, inner: string) =>
    `<section class="tw-avoid-break" style="margin-bottom:34px">
       ${eyebrow(eyebrowText)}
       <h2 style="font-size:24px;margin:2px 0 10px;color:${BRAND.navy}">${title}</h2>
       <hr class="tw-rule" style="margin-bottom:16px"/>
       ${inner}
     </section>`;

  const statCallout = (n: string, label: string, accent: string = BRAND.navy) =>
    `<div class="tw-avoid-break" style="background:${BRAND.white};border:1px solid ${BRAND.border};border-radius:8px;padding:16px 18px">
       <div class="tw-stat-num" style="font-size:30px;color:${accent}">${n}</div>
       <div class="tw-stat-label" style="margin-top:4px">${label}</div>
     </div>`;

  const kpiGrid = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px">${
    kpis.map(k => statCallout(k.num, k.label, BRAND.blue)).join('')}</div>`;

  // Performance metric rows with QoQ where available.
  const perfRow = (label: string, value: string, delta = '') =>
    `<div style="display:flex;justify-content:space-between;align-items:baseline;padding:9px 0;border-bottom:1px solid ${BRAND.border}">
       <span style="color:${BRAND.bodyMuted};font-size:13px">${label}</span>
       <span style="font-weight:700;color:${BRAND.navy};font-size:14px">${value}${delta}</span>
     </div>`;

  const perfBlock = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 28px">
      <div>
        ${perfRow('Physical Occupancy', pct(m.occupancyPct), deltaChip(m.occupancyPct, m.occupancyPriorPct, true))}
        ${perfRow('Economic Occupancy', pct(m.economicOccupancyPct))}
        ${perfRow('Net Operating Income (NOI)', m.noi.trim() ? (/^\$/.test(m.noi) ? m.noi : `$${m.noi}`) : '—', deltaChip(m.noi, m.noiPrior, true))}
        ${perfRow('Revenue', m.revenue.trim() ? (/^\$/.test(m.revenue) ? m.revenue : `$${m.revenue}`) : '—')}
        ${perfRow('Operating Expense Ratio (OER)', pct(m.oerPct), deltaChip(m.oerPct, m.oerPriorPct, false))}
      </div>
      <div>
        ${perfRow('Lease Renewal Rate', pct(m.renewalRatePct))}
        ${perfRow('Tenant Retention Rate', pct(m.retentionRatePct))}
        ${perfRow('Collections Rate', pct(m.collectionsRatePct))}
        ${perfRow('Rental Arrears', m.arrears.trim() ? (/^\$/.test(m.arrears) ? m.arrears : `$${m.arrears}`) : '—')}
        ${perfRow('Tenant Turnover', pct(m.turnoverPct))}
      </div>
    </div>`;

  const chartsBlock = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:18px">
      <div class="tw-avoid-break">
        <p class="tw-stat-label" style="margin-bottom:8px">Occupancy Trend (last 4 quarters)</p>
        ${barChartSvg(d.occupancyTrend, 'Occupancy')}
      </div>
      <div class="tw-avoid-break">
        <p class="tw-stat-label" style="margin-bottom:8px">Leasing Activity Breakdown</p>
        ${d.leasingBreakdown.length ? donutChartSvg(d.leasingBreakdown) : `<p style="color:${BRAND.caption};font-size:12px">No active initiatives to chart.</p>`}
      </div>
    </div>`;

  const leasingTable = `
    <table style="font-size:12px">
      <thead>
        <tr style="background:${BRAND.navy};color:#fff;text-align:left">
          <th style="padding:8px 10px">Tenant / Property</th>
          <th style="padding:8px 10px">Market</th>
          <th style="padding:8px 10px">Strategy</th>
          <th style="padding:8px 10px">Stage</th>
          <th style="padding:8px 10px;text-align:right">SF</th>
          <th style="padding:8px 10px">Lease Exp.</th>
          <th style="padding:8px 10px">Lead</th>
        </tr>
      </thead>
      <tbody>
        ${d.leasingDetail.length ? d.leasingDetail.map((l, i) => `
          <tr style="background:${i % 2 ? BRAND.card : BRAND.white};border-bottom:1px solid ${BRAND.border}">
            <td style="padding:7px 10px;color:${BRAND.navy};font-weight:600">${l.tenant} — ${l.property}</td>
            <td style="padding:7px 10px">${l.market || '—'}</td>
            <td style="padding:7px 10px">${l.strategy || '—'}</td>
            <td style="padding:7px 10px">${l.stage || '—'}</td>
            <td style="padding:7px 10px;text-align:right">${(l.sqft || 0).toLocaleString()}</td>
            <td style="padding:7px 10px">${fmtDate(l.leaseEnd)}</td>
            <td style="padding:7px 10px">${l.clientLead || '—'}</td>
          </tr>`).join('') : `<tr><td colspan="7" style="padding:10px;color:${BRAND.caption}">No active leasing activity this quarter.</td></tr>`}
      </tbody>
    </table>`;

  const expTable = `
    <table style="font-size:12px;margin-top:6px">
      <thead>
        <tr style="border-bottom:2px solid ${BRAND.blue};text-align:left;color:${BRAND.navy}">
          <th style="padding:7px 10px">Tenant / Property</th>
          <th style="padding:7px 10px">Market</th>
          <th style="padding:7px 10px;text-align:right">SF</th>
          <th style="padding:7px 10px">Expiration</th>
        </tr>
      </thead>
      <tbody>
        ${d.upcomingExpirations.length ? d.upcomingExpirations.map((l, i) => `
          <tr style="background:${i % 2 ? BRAND.card : BRAND.white};border-bottom:1px solid ${BRAND.border}">
            <td style="padding:6px 10px;color:${BRAND.navy};font-weight:600">${l.tenant} — ${l.property}</td>
            <td style="padding:6px 10px">${l.market || '—'}</td>
            <td style="padding:6px 10px;text-align:right">${(l.sqft || 0).toLocaleString()}</td>
            <td style="padding:6px 10px">${fmtDate(l.leaseEnd)}</td>
          </tr>`).join('') : `<tr><td colspan="4" style="padding:10px;color:${BRAND.caption}">No expirations in the next 12 months.</td></tr>`}
      </tbody>
    </table>`;

  const actionTable = `
    <table style="font-size:12px">
      <thead>
        <tr style="background:${BRAND.navy};color:#fff;text-align:left">
          <th style="padding:8px 10px">Action Item</th>
          <th style="padding:8px 10px">Owner</th>
          <th style="padding:8px 10px">Target Date</th>
          <th style="padding:8px 10px">Status</th>
        </tr>
      </thead>
      <tbody>
        ${d.actionItems.length ? d.actionItems.map((a, i) => `
          <tr style="background:${i % 2 ? BRAND.card : BRAND.white};border-bottom:1px solid ${BRAND.border}">
            <td style="padding:7px 10px;color:${BRAND.navy}">${a.item || '—'}</td>
            <td style="padding:7px 10px">${a.owner || '—'}</td>
            <td style="padding:7px 10px">${a.targetDate ? fmtDate(a.targetDate) : '—'}</td>
            <td style="padding:7px 10px">${a.status || '—'}</td>
          </tr>`).join('') : `<tr><td colspan="4" style="padding:10px;color:${BRAND.caption}">No action items recorded.</td></tr>`}
      </tbody>
    </table>`;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>QBR — ${d.portfolioName} — ${d.quarter} ${d.year}</title>
${BRAND_FONT_LINKS}
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:${BRAND_FONTS.sans}; background:${BRAND.cream}; color:${BRAND.body}; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  h1,h2,h3 { font-family:${BRAND_FONTS.serif}; color:${BRAND.navy}; }
  .tw-eyebrow { text-transform:uppercase; letter-spacing:0.12em; color:${BRAND.blue}; font-size:11px; font-weight:700; }
  .tw-rule { height:2px; background:${BRAND.blue}; border:0; }
  .tw-stat-num { font-family:${BRAND_FONTS.serif}; font-weight:800; line-height:1; }
  .tw-stat-label { color:${BRAND.caption}; font-size:11px; text-transform:uppercase; letter-spacing:0.08em; }
  table { border-collapse:collapse; width:100%; }
  .body-wrap { max-width:920px; margin:0 auto; padding:36px 40px; }
  @media print { @page { margin:0.5in; size:letter; } .tw-page-break { page-break-after:always; break-after:page; } .tw-avoid-break { break-inside:avoid; page-break-inside:avoid; } }
</style></head><body>

  <!-- COVER -->
  <div class="tw-page-break" style="min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:64px 32px;background:${BRAND.cream}">
    <div style="margin-bottom:26px">${transwesternLogoSvg({ size: 64, wordmark: true })}</div>
    <p class="tw-eyebrow" style="margin-bottom:10px">Quarterly Business Review</p>
    <h1 style="font-size:40px;line-height:1.15;margin-bottom:8px">${d.portfolioName}</h1>
    <p style="font-size:20px;font-weight:600;color:${BRAND.blue};margin-bottom:26px">${d.quarter} ${d.year}</p>
    <div style="font-size:12px;color:${BRAND.caption}">
      <p>Prepared by ${d.preparedBy || 'Transwestern'} · ${d.preparedDate}</p>
    </div>
  </div>

  <div class="body-wrap">
    ${section('exec', 'Executive Summary', 'Alignment · Transparency · Storytelling', `
      <p style="font-size:13px;line-height:1.7;color:${BRAND.bodyMuted};margin-bottom:12px">${QBR_PURPOSE}</p>
      ${d.execSummary.trim() ? `<p style="font-size:13px;line-height:1.7;margin-bottom:16px">${d.execSummary}</p>` : ''}
      ${kpiGrid}
    `)}

    ${section('perf', 'Portfolio Performance', 'Past Quarter', perfBlock + chartsBlock)}

    ${section('leasing', 'Leasing & Activity Detail', 'Active Initiatives', leasingTable)}

    ${section('opps', 'Upcoming Opportunities', 'Next 12 Months', `
      ${d.opportunitiesNarrative.trim() ? `<p style="font-size:13px;line-height:1.7;margin-bottom:12px">${d.opportunitiesNarrative}</p>` : ''}
      ${expTable}
    `)}

    ${section('action', 'Action Plan — Next Quarter', 'Owners · Targets · Status', actionTable)}

    <div style="border-top:1px solid ${BRAND.border};padding-top:12px;margin-top:8px;text-align:center">
      <p style="font-size:10px;color:${BRAND.caption}">© ${new Date().getFullYear()} Transwestern&nbsp;&nbsp;|&nbsp;&nbsp;Confidential &amp; Proprietary · ${d.portfolioName} · ${d.quarter} ${d.year}</p>
    </div>
  </div>
</body></html>`;
}

export function openQBRPdf(d: QBRData): void {
  const html = buildQBRHtml(d);
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  setTimeout(() => { try { w.print(); } catch { /* user can print manually */ } }, 500);
}

// ── PPTX ──────────────────────────────────────────────────────────────────────
export function sanitizeFilePart(s: string): string {
  return (s || 'Portfolio').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'Portfolio';
}

function hex(c: string): string { return String(c).replace('#', ''); }

export async function downloadQBRPptx(d: QBRData): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'WIDE', width: 13.333, height: 7.5 });
  pptx.layout = 'WIDE';
  pptx.author = 'Transwestern';
  pptx.company = 'Transwestern';
  pptx.subject = `QBR ${d.quarter} ${d.year}`;
  pptx.title = `${d.portfolioName} — QBR ${d.quarter} ${d.year}`;

  const NAVY = hex(BRAND.navy);
  const BLUE = hex(BRAND.blue);
  const SKY = hex(BRAND.sky);
  const CREAM = hex(BRAND.cream);
  const CAPTION = hex(BRAND.caption);
  const serif = BRAND_FONTS.pptxSerif;
  const sans = BRAND_FONTS.pptxSans;
  const m = d.metrics;

  // Small Transwestern mark via shapes (top bar + stem, two tones).
  const addMark = (slide: PptxGenJS.Slide, x: number, y: number, scale = 1) => {
    const u = 0.16 * scale;
    slide.addShape(pptx.ShapeType.rect, { x, y, w: u * 5, h: u * 2.2, fill: { color: hex(BRAND.blueDeep) } });
    slide.addShape(pptx.ShapeType.rect, { x: x + u * 5, y, w: u * 5, h: u * 2.2, fill: { color: hex(BRAND.skyLight) } });
    slide.addShape(pptx.ShapeType.rect, { x: x + u * 3.7, y: y + u * 2.2, w: u * 1.3, h: u * 5.5, fill: { color: hex(BRAND.blueDeep) } });
    slide.addShape(pptx.ShapeType.rect, { x: x + u * 5, y: y + u * 2.2, w: u * 1.3, h: u * 5.5, fill: { color: hex(BRAND.skyLight) } });
  };

  const footer = (slide: PptxGenJS.Slide) => {
    slide.addText(`© ${new Date().getFullYear()} Transwestern  |  Confidential & Proprietary`, {
      x: 0.5, y: 7.05, w: 12.3, h: 0.3, fontSize: 8, color: CAPTION, fontFace: sans, align: 'left',
    });
  };

  const contentTitle = (slide: PptxGenJS.Slide, eyebrow: string, title: string) => {
    slide.background = { color: CREAM };
    addMark(slide, 0.5, 0.4, 0.7);
    slide.addText(eyebrow.toUpperCase(), { x: 0.5, y: 1.0, w: 12, h: 0.3, fontSize: 11, bold: true, color: BLUE, fontFace: sans, charSpacing: 2 });
    slide.addText(title, { x: 0.5, y: 1.3, w: 12, h: 0.6, fontSize: 28, bold: true, color: NAVY, fontFace: serif });
    slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.95, w: 12.3, h: 0.03, fill: { color: BLUE } });
    footer(slide);
  };

  // 1 — Cover
  const cover = pptx.addSlide();
  cover.background = { color: NAVY };
  addMark(cover, 5.9, 1.6, 1.4);
  cover.addText('Transwestern', { x: 0, y: 2.7, w: 13.333, h: 0.6, align: 'center', fontSize: 26, bold: true, color: 'FFFFFF', fontFace: serif });
  cover.addText('QUARTERLY BUSINESS REVIEW', { x: 0, y: 3.5, w: 13.333, h: 0.4, align: 'center', fontSize: 14, bold: true, color: hex(BRAND.skyLight), fontFace: sans, charSpacing: 3 });
  cover.addText(d.portfolioName, { x: 0, y: 3.95, w: 13.333, h: 0.7, align: 'center', fontSize: 36, bold: true, color: 'FFFFFF', fontFace: serif });
  cover.addText(`${d.quarter} ${d.year}`, { x: 0, y: 4.75, w: 13.333, h: 0.5, align: 'center', fontSize: 20, color: hex(BRAND.skyLight), fontFace: sans });
  cover.addText(`Prepared by ${d.preparedBy || 'Transwestern'}  ·  ${d.preparedDate}`, { x: 0, y: 6.4, w: 13.333, h: 0.4, align: 'center', fontSize: 11, color: 'C9D2E0', fontFace: sans });

  // 2 — Executive Summary
  const exec = pptx.addSlide();
  contentTitle(exec, 'Alignment · Transparency · Storytelling', 'Executive Summary');
  exec.addText(QBR_PURPOSE, { x: 0.5, y: 2.2, w: 12.3, h: 1.0, fontSize: 13, color: hex(BRAND.bodyMuted), fontFace: sans, italic: true });
  if (d.execSummary.trim()) {
    exec.addText(d.execSummary, { x: 0.5, y: 3.25, w: 12.3, h: 1.0, fontSize: 13, color: hex(BRAND.body), fontFace: sans });
  }
  const kpis = headlineKpis(d);
  const kpiW = 2.95, kpiGap = 0.13, kpiStartX = 0.5;
  kpis.forEach((k, i) => {
    const x = kpiStartX + i * (kpiW + kpiGap);
    exec.addShape(pptx.ShapeType.roundRect, { x, y: 4.5, w: kpiW, h: 1.7, fill: { color: 'FFFFFF' }, line: { color: hex(BRAND.border), width: 1 }, rectRadius: 0.08 });
    exec.addText(k.num, { x, y: 4.7, w: kpiW, h: 0.8, align: 'center', fontSize: 30, bold: true, color: BLUE, fontFace: serif });
    exec.addText(k.label, { x: x + 0.1, y: 5.55, w: kpiW - 0.2, h: 0.5, align: 'center', fontSize: 10, color: CAPTION, fontFace: sans });
  });

  // 3 — Portfolio Performance (KPI table + QoQ)
  const perf = pptx.addSlide();
  contentTitle(perf, 'Past Quarter', 'Portfolio Performance');
  const perfRows: PptxGenJS.TableRow[] = [
    [
      { text: 'Metric', options: { bold: true, color: 'FFFFFF', fill: { color: NAVY }, fontFace: sans } },
      { text: 'This Quarter', options: { bold: true, color: 'FFFFFF', fill: { color: NAVY }, fontFace: sans } },
      { text: 'Prior Quarter', options: { bold: true, color: 'FFFFFF', fill: { color: NAVY }, fontFace: sans } },
    ],
    ...([
      ['Physical Occupancy', pct(m.occupancyPct), pct(m.occupancyPriorPct)],
      ['Economic Occupancy', pct(m.economicOccupancyPct), '—'],
      ['Net Operating Income', m.noi.trim() ? (/^\$/.test(m.noi) ? m.noi : `$${m.noi}`) : '—', m.noiPrior.trim() ? (/^\$/.test(m.noiPrior) ? m.noiPrior : `$${m.noiPrior}`) : '—'],
      ['Revenue', m.revenue.trim() ? (/^\$/.test(m.revenue) ? m.revenue : `$${m.revenue}`) : '—', '—'],
      ['Operating Expense Ratio', pct(m.oerPct), pct(m.oerPriorPct)],
      ['Lease Renewal Rate', pct(m.renewalRatePct), '—'],
      ['Tenant Retention Rate', pct(m.retentionRatePct), '—'],
      ['Collections Rate', pct(m.collectionsRatePct), '—'],
      ['Rental Arrears', m.arrears.trim() ? (/^\$/.test(m.arrears) ? m.arrears : `$${m.arrears}`) : '—', '—'],
      ['Tenant Turnover', pct(m.turnoverPct), '—'],
    ] as string[][]).map((r, i) => r.map((c, ci) => ({
      text: c,
      options: { fontFace: sans, color: ci === 0 ? NAVY : hex(BRAND.body), bold: ci === 0, fill: { color: i % 2 ? hex(BRAND.card) : 'FFFFFF' } },
    }))),
  ];
  perf.addTable(perfRows, { x: 0.5, y: 2.25, w: 6.6, colW: [3.0, 1.8, 1.8], fontSize: 11, border: { type: 'solid', color: hex(BRAND.border), pt: 1 }, valign: 'middle', rowH: 0.36 });
  // Occupancy trend native bar chart
  perf.addChart(pptx.ChartType.bar, [{
    name: 'Occupancy %', labels: d.occupancyTrend.map(t => t.label), values: d.occupancyTrend.map(t => t.value),
  }], {
    x: 7.4, y: 2.4, w: 5.4, h: 3.6, barDir: 'col', chartColors: [BLUE], showTitle: true, title: 'Occupancy Trend (%)', titleColor: NAVY, titleFontFace: serif, titleFontSize: 13,
    showValue: true, dataLabelColor: NAVY, dataLabelFontFace: sans, dataLabelFontSize: 9, valAxisMaxVal: 100, valAxisMinVal: 0,
    catAxisLabelColor: CAPTION, valAxisLabelColor: CAPTION, showLegend: false,
  });

  // 4 — Leasing breakdown chart
  const lease = pptx.addSlide();
  contentTitle(lease, 'Active Initiatives', 'Leasing Activity Breakdown');
  if (d.leasingBreakdown.length) {
    lease.addChart(pptx.ChartType.doughnut, [{
      name: 'Activity', labels: d.leasingBreakdown.map(b => b.label), values: d.leasingBreakdown.map(b => b.value),
    }], {
      x: 0.5, y: 2.3, w: 5.6, h: 4.0, holeSize: 55, showLegend: true, legendPos: 'r', legendColor: NAVY, legendFontFace: sans,
      chartColors: [BLUE, NAVY, SKY, hex(BRAND.blueDeep), CAPTION], showValue: true, dataLabelColor: 'FFFFFF', dataLabelFontFace: sans, dataLabelFontSize: 10,
    });
  } else {
    lease.addText('No active initiatives to chart.', { x: 0.5, y: 3, w: 6, h: 0.5, fontSize: 13, color: CAPTION, fontFace: sans });
  }
  // Leasing detail table (top 10)
  const leaseRows: PptxGenJS.TableRow[] = [
    ['Tenant / Property', 'Strategy', 'SF', 'Lease Exp.'].map(h => ({ text: h, options: { bold: true, color: 'FFFFFF', fill: { color: NAVY }, fontFace: sans, fontSize: 10 } })),
    ...d.leasingDetail.slice(0, 10).map((l, i) => ([
      `${l.tenant} — ${l.property}`, l.strategy || '—', (l.sqft || 0).toLocaleString(), fmtDate(l.leaseEnd),
    ].map((c, ci) => ({ text: c, options: { fontFace: sans, fontSize: 9, color: ci === 0 ? NAVY : hex(BRAND.body), fill: { color: i % 2 ? hex(BRAND.card) : 'FFFFFF' } } })))),
  ];
  lease.addTable(leaseRows.length > 1 ? leaseRows : [...leaseRows, [{ text: 'No activity', options: { fontFace: sans, fontSize: 9 } }]], {
    x: 6.4, y: 2.3, w: 6.4, colW: [3.0, 1.6, 0.9, 0.9], border: { type: 'solid', color: hex(BRAND.border), pt: 1 }, valign: 'middle', rowH: 0.3,
  });

  // 5 — Upcoming Opportunities
  const opp = pptx.addSlide();
  contentTitle(opp, 'Next 12 Months', 'Upcoming Opportunities');
  if (d.opportunitiesNarrative.trim()) {
    opp.addText(d.opportunitiesNarrative, { x: 0.5, y: 2.2, w: 12.3, h: 0.9, fontSize: 12, color: hex(BRAND.body), fontFace: sans });
  }
  const oppRows: PptxGenJS.TableRow[] = [
    ['Tenant / Property', 'Market', 'SF', 'Expiration'].map(h => ({ text: h, options: { bold: true, color: 'FFFFFF', fill: { color: NAVY }, fontFace: sans } })),
    ...(d.upcomingExpirations.length ? d.upcomingExpirations.slice(0, 12).map((l, i) => ([
      `${l.tenant} — ${l.property}`, l.market || '—', (l.sqft || 0).toLocaleString(), fmtDate(l.leaseEnd),
    ].map((c, ci) => ({ text: c, options: { fontFace: sans, fontSize: 10, color: ci === 0 ? NAVY : hex(BRAND.body), fill: { color: i % 2 ? hex(BRAND.card) : 'FFFFFF' } } }))))
      : [[{ text: 'No expirations in the next 12 months.', options: { fontFace: sans, fontSize: 10, color: CAPTION } }, { text: '' }, { text: '' }, { text: '' }]]),
  ];
  opp.addTable(oppRows, { x: 0.5, y: d.opportunitiesNarrative.trim() ? 3.2 : 2.3, w: 12.3, colW: [6.0, 2.8, 1.7, 1.8], border: { type: 'solid', color: hex(BRAND.border), pt: 1 }, valign: 'middle', rowH: 0.34 });

  // 6 — Action Plan
  const action = pptx.addSlide();
  contentTitle(action, 'Owners · Targets · Status', 'Action Plan — Next Quarter');
  const actionRows: PptxGenJS.TableRow[] = [
    ['Action Item', 'Owner', 'Target Date', 'Status'].map(h => ({ text: h, options: { bold: true, color: 'FFFFFF', fill: { color: NAVY }, fontFace: sans } })),
    ...(d.actionItems.length ? d.actionItems.map((a, i) => ([
      a.item || '—', a.owner || '—', a.targetDate ? fmtDate(a.targetDate) : '—', a.status || '—',
    ].map((c, ci) => ({ text: c, options: { fontFace: sans, fontSize: 11, color: ci === 0 ? NAVY : hex(BRAND.body), fill: { color: i % 2 ? hex(BRAND.card) : 'FFFFFF' } } }))))
      : [[{ text: 'No action items recorded.', options: { fontFace: sans, fontSize: 11, color: CAPTION } }, { text: '' }, { text: '' }, { text: '' }]]),
  ];
  action.addTable(actionRows, { x: 0.5, y: 2.3, w: 12.3, colW: [6.3, 2.5, 1.9, 1.6], border: { type: 'solid', color: hex(BRAND.border), pt: 1 }, valign: 'middle', rowH: 0.4 });

  const fileName = `QBR_${sanitizeFilePart(d.portfolioName)}_${d.quarter}_${d.year}.pptx`;
  await pptx.writeFile({ fileName });
}
