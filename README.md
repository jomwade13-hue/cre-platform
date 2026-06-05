# CRE Platform — Foresite

Commercial real estate client portal: Portfolio Tracker with Property Database, Active Initiatives Report, Roadmap, and QBR Report.

## Tech stack
React 18 + TypeScript + Vite, Tailwind CSS, shadcn/ui, Recharts, Leaflet, Express, SQLite (better-sqlite3) + Drizzle ORM. PowerPoint export uses `pptxgenjs` (client-side).

## Reports & branding
All print/report output is Transwestern-branded with a shared design system in `client/src/lib/brand.ts` (deep navy `#1B2A4A`, brand blue `#3F7FD4`, sky `#7FB5C4`, cream paper `#F7F5EF`; Playfair Display serif headings + Inter body, loaded via Google Fonts in each print document). The firm mark is an inline SVG component, `client/src/components/TranswesternLogo.tsx` (full-color, monochrome, and wordmark variants), and appears in every report header. Reports stay "daytime" (light) for readability and ink economy.

Branded reports:
- **Active Initiatives Snapshot** and **Portfolio Activity** print reports (Portfolio Tracker).
- **Decommission Checklists** print/PDF (one page per location).

### QBR Report (Quarterly Business Review)
A **QBR Report** button next to **Print Report** opens a modal to pick the quarter + year and generate a branded Quarterly Business Review in two formats:
- **PDF** — via the existing print-to-PDF popup pattern, fully Transwestern-themed.
- **PowerPoint (.pptx)** — a real downloadable deck built client-side with `pptxgenjs`, named `QBR_{PortfolioName}_{Qx}_{Year}.pptx`.

The QBR evaluates past performance, identifies upcoming opportunities, and plans next-quarter action steps — a tool for alignment, transparency, and data-driven storytelling. Sections: Cover, Executive Summary (+purpose + headline KPIs), Portfolio Performance (occupancy, NOI/revenue, OER, renewal/retention, leasing activity, arrears/collections, turnover — derived from app data where possible, with QoQ comparison; anything not stored is entered in the modal so numbers are real), Leasing & Activity Detail, Upcoming Opportunities (expirations derived from lease end dates), and an editable Action Plan (prepopulated from open initiatives). Includes brand-colored charts (occupancy trend bar + leasing-activity donut) in both the PDF (inline SVG) and the PPTX (native charts). QBR generation is entirely client-side; it adds no backend routes and respects the existing auth/portfolio scoping.

## Local development
```bash
npm install --legacy-peer-deps
npm run db:push
npm run dev
```
App runs on http://localhost:5000

## Authentication & access control
The app uses server-side session auth (passport-local + express-session) with scrypt password hashing. Users are `admin` or `client`; clients see only the portfolios assigned to them. Admins manage accounts and assignments from the in-app Admin panel.

### Environment variables
| Variable | Required | Purpose |
| --- | --- | --- |
| `SESSION_SECRET` | Production | Signs session cookies. If unset, a random secret is generated at startup (sessions won't survive a restart). **Set a stable value in production.** |
| `ADMIN_EMAIL` | First boot | Email for the bootstrapped admin account. Defaults to `jomwade13@icloud.com` if unset. |
| `ADMIN_PASSWORD` | First boot | Password for the bootstrapped admin. If unset, a strong random password is generated and printed **once** to the server log — capture it from there. |

The admin account is created only when no admin exists yet. On first deploy, set `ADMIN_EMAIL` and `ADMIN_PASSWORD`, or read the generated password from the startup log.

## Production build
```bash
npm run build
NODE_ENV=production npm start
```

## Deployment (Railway)
- `railway.json` and `nixpacks.toml` configure Railway build/deploy.
- Set `DATABASE_PATH=/app/data/data.db` env var and mount a persistent volume at `/app/data` so SQLite data survives redeploys.
- `npm run db:push -- --force` runs on each deploy to apply schema changes.

## Custom domain
Configured for `twforesite.com` via Cloudflare DNS → Railway custom domain.
