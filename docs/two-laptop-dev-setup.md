# Two-Laptop Development Setup

This setup uses the spare laptop as a small Docker/database host so the main laptop can keep RAM for the editor, browser, Codex, and local app processes.

## What To Move

Move these first:

- Docker Desktop or Docker Engine
- `stoneboyz_crm_postgres`
- `stoneboyz_crm_postgres_test`

Keep these on the main laptop at first:

- VS Code/Codex/browser
- `pnpm dev:api`
- `pnpm dev:web`

Optional later move:

- Run the API on the spare laptop too, leaving only the web app/browser on the main laptop.

## Why This Works

The CRM only depends on Postgres over TCP:

- Dev database: `postgresql://stoneboyz:stoneboyz@HOST:5432/stoneboyz_crm_dev`
- Test database: `postgresql://stoneboyz_test:stoneboyz_test@HOST:5433/stoneboyz_crm_test`

The Docker compose file already publishes those ports to the network.

## Spare Laptop Setup

Install Docker on the spare laptop. Lightweight Linux is best for RAM, but Windows with Docker Desktop also works.

Clone the repo or copy this folder there:

```powershell
git clone <repo-url> stoneboyz_crm
cd stoneboyz_crm
```

Start the databases:

```powershell
docker compose up -d postgres postgres_test
```

Find the spare laptop IP:

```powershell
ipconfig
```

Use the IPv4 address on your Wi-Fi network, for example `192.168.1.42`.

Allow inbound ports on the spare laptop firewall:

```powershell
New-NetFirewallRule -DisplayName "Stoneboyz Postgres Dev" -Direction Inbound -Protocol TCP -LocalPort 5432 -Action Allow
New-NetFirewallRule -DisplayName "Stoneboyz Postgres Test" -Direction Inbound -Protocol TCP -LocalPort 5433 -Action Allow
```

## Main Laptop Setup

Stop the local database containers:

```powershell
docker compose down
```

Update `apps/api/.env`:

```env
DATABASE_URL=postgresql://stoneboyz:stoneboyz@192.168.1.42:5432/stoneboyz_crm_dev
BETTER_AUTH_SECRET=super-secret-dev-key-change-in-production-32chars
BETTER_AUTH_URL=http://localhost:3001
PORT=3001
APP_URL=http://localhost:3001
```

Update `apps/web/.env.local`:

```env
API_BASE_URL=http://localhost:3001/api/v1
BETTER_AUTH_SECRET=super-secret-dev-key-change-in-production-32chars
BETTER_AUTH_URL=http://localhost:3000
DATABASE_URL=postgresql://stoneboyz:stoneboyz@192.168.1.42:5432/stoneboyz_crm_dev
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Update `.env.test`:

```env
DATABASE_URL=postgresql://stoneboyz_test:stoneboyz_test@192.168.1.42:5433/stoneboyz_crm_test
```

Run migrations against the remote dev database:

```powershell
pnpm db:migrate
```

Run the app as usual:

```powershell
pnpm dev
```

## Connectivity Checks

From the main laptop:

```powershell
Test-NetConnection 192.168.1.42 -Port 5432
Test-NetConnection 192.168.1.42 -Port 5433
```

If either fails:

- Confirm both laptops are on the same Wi-Fi.
- Confirm the spare laptop did not sleep.
- Check Windows Firewall on the spare laptop.
- Confirm Docker is running on the spare laptop.

## Migrating Current Dev Data

If you want to keep the existing local dev database data, export from the main laptop:

```powershell
docker exec stoneboyz_crm_postgres pg_dump -U stoneboyz stoneboyz_crm_dev > stoneboyz_crm_dev.sql
```

Copy `stoneboyz_crm_dev.sql` to the spare laptop, then import:

```powershell
docker exec -i stoneboyz_crm_postgres psql -U stoneboyz stoneboyz_crm_dev < stoneboyz_crm_dev.sql
```

If dev data is disposable, skip this and just run migrations.

## Good Next Step

Once the database move is stable, consider running `pnpm dev:api` on the spare laptop too. Then the main laptop only runs Next.js and the browser, while the spare laptop hosts Postgres and the API.
