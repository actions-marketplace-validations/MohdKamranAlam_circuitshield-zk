# Database Setup

CircuitShield uses the same environment style as the machine-health project:

```env
DB_ENGINE=postgresql
DATABASE_URL=postgresql://...
```

If `DATABASE_URL` is not set, the app still works in local in-memory/file mode, but scan history is not persisted.

## Neon

Create a private `.env` file:

```env
DB_ENGINE=postgresql
DATABASE_URL=postgresql://neondb_owner:<PASSWORD>@ep-polished-king-akppezrh-pooler.c-3.us-west-2.aws.neon.tech:5432/neondb?sslmode=require
```

Do not commit the real password.

Run migrations:

```powershell
npm run build
node dist/cli.js db migrate
```

Start the API:

```powershell
npm run api
```

Check status:

```powershell
node dist/cli.js db:status
```

## Local PostgreSQL

Using Docker Compose:

```powershell
docker compose up -d postgres
```

Local `.env`:

```env
DB_ENGINE=postgresql
DATABASE_URL=postgresql://circuitshield_owner:circuitshield_local_password@127.0.0.1:55432/circuitshield?sslmode=disable
```

Then:

```powershell
node dist/cli.js db migrate
npm run api
```

## Tables

The migration creates:

- `cs_projects`
- `cs_scans`
- `cs_baselines`
- `cs_benchmarks`

Stored scan payloads are JSONB so the UI can show full scan history later without losing raw analyzer details.
