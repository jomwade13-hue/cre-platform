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
