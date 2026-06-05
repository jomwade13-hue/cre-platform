// ── Transwestern brand tokens ────────────────────────────────────────────────
// Single source of truth for the Transwestern look applied across every print
// report (Active Initiatives Snapshot, Portfolio Activity, Decommission
// Checklists) and the QBR report (PDF + PPTX). Reports stay "daytime" / light:
// navy + brand-blue ink on cream/white paper for strong contrast and ink economy.

export const BRAND = {
  // Core palette
  navy: '#1B2A4A',       // primary headings / dark bars
  navyDeep: '#16213C',   // darkest elements
  blue: '#3F7FD4',       // accent / eyebrows / links / KPI highlights
  blueDeep: '#2F6FC4',   // logo left tone / stronger accent
  sky: '#7FB5C4',        // secondary accent (charts, flourishes)
  skyLight: '#9FCBD8',   // logo right tone
  cream: '#F7F5EF',      // page (paper) background
  white: '#FFFFFF',      // inner content cards
  card: '#FAF8F2',       // subtle zebra / muted surface
  slate: '#2E3A5C',      // dark chips
  // Text
  ink: '#1B2A4A',        // headings
  body: '#3A3F4A',       // body text
  bodyMuted: '#4A4F5A',  // secondary body
  caption: '#8A8F99',    // captions / muted labels
  // Borders
  border: '#E3E0D8',
  borderStrong: '#D8D5CC',
  // Status (kept light/daytime, brand-aligned)
  green: '#16A34A',
  amber: '#D97706',
  red: '#DC2626',
} as const;

// Font stacks. Print HTML loads Playfair Display + Inter via Google Fonts.
export const BRAND_FONTS = {
  serif: "'Playfair Display', Georgia, 'Times New Roman', serif",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  // PPTX face names (embedding is limited — use widely-available fallbacks)
  pptxSerif: 'Georgia',
  pptxSans: 'Calibri',
} as const;

// Google Fonts <link> tags injected into the <head> of every print popup.
export const BRAND_FONT_LINKS =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">';

// Shared print CSS: base typography + brand helper classes. Drop into any
// print popup's <style>. Keeps daytime contrast and sensible page breaks.
export function brandPrintBaseCss(): string {
  return `
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:${BRAND_FONTS.sans}; background:${BRAND.cream}; color:${BRAND.body}; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    h1,h2,h3,.tw-serif { font-family:${BRAND_FONTS.serif}; color:${BRAND.navy}; }
    .tw-eyebrow { font-family:${BRAND_FONTS.sans}; text-transform:uppercase; letter-spacing:0.12em; color:${BRAND.blue}; font-size:11px; font-weight:700; }
    .tw-rule { height:2px; background:${BRAND.blue}; border:0; }
    .tw-stat-num { font-family:${BRAND_FONTS.serif}; color:${BRAND.navy}; font-weight:800; line-height:1; }
    .tw-stat-label { font-family:${BRAND_FONTS.sans}; color:${BRAND.caption}; font-size:11px; text-transform:uppercase; letter-spacing:0.08em; }
    table { border-collapse:collapse; width:100%; }
    @media print {
      @page { margin:0.5in; size:letter; }
      .tw-page-break { page-break-after:always; break-after:page; }
      .tw-avoid-break { break-inside:avoid; page-break-inside:avoid; }
    }
  `;
}

// Inline Transwestern logo mark (two-tone "T") as raw SVG markup for print HTML
// strings. `mono` renders a single navy tone for monochrome contexts.
// `wordmark` appends the "Transwestern" serif wordmark.
export function transwesternLogoSvg(opts?: { size?: number; mono?: boolean; wordmark?: boolean; onDark?: boolean }): string {
  const size = opts?.size ?? 36;
  const mono = opts?.mono ?? false;
  const wordmark = opts?.wordmark ?? false;
  const onDark = opts?.onDark ?? false;
  const left = mono ? (onDark ? BRAND.white : BRAND.navy) : BRAND.blueDeep;
  const right = mono ? (onDark ? BRAND.white : BRAND.navy) : BRAND.skyLight;
  const wordColor = onDark ? BRAND.white : BRAND.navy;
  // viewBox 0 0 48 48 — wide top bar + centered stem, split left/right tones.
  const mark =
    `<svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" role="img" aria-label="Transwestern" style="display:block">` +
      `<rect x="4" y="8" width="20" height="9" fill="${left}"/>` +
      `<rect x="24" y="8" width="20" height="9" fill="${right}"/>` +
      `<rect x="19" y="17" width="5" height="23" fill="${left}"/>` +
      `<rect x="24" y="17" width="5" height="23" fill="${right}"/>` +
    `</svg>`;
  if (!wordmark) return mark;
  return (
    `<span style="display:inline-flex;align-items:center;gap:10px">` +
      mark +
      `<span style="font-family:${BRAND_FONTS.serif};font-weight:700;font-size:${Math.round(size * 0.62)}px;color:${wordColor};letter-spacing:0.01em">Transwestern</span>` +
    `</span>`
  );
}
