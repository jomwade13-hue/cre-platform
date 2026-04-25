# CRE Platform — Foresite

Commercial real estate client portal: Portfolio Tracker with Property Database, Active Initiatives Report, Roadmap, and QBR Report.

## Tech stack
React 18 + TypeScript + Vite, Tailwind CSS, shadcn/ui, Recharts, Leaflet, Express, SQLite (better-sqlite3) + Drizzle ORM.

## Local development
```bash
npm install --legacy-peer-deps
npm run db:push
npm run dev
```
App runs on http://localhost:5000

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
