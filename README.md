# TILE / OS — Backend

Backend for TILE / OS, a tile-store business operating system connecting CRM,
quotations, orders, inventory, purchasing, logistics, accounts, people &
assets, HR/incentives, profitability, and reporting into one system. See
[docs/planning/](docs/planning/) for the original product context, workflow
rules, and execution plan this backend was built against.

**Scope:** all 15 phases of the execution plan (Foundation through
Hardening) are implemented — see [Status](#status) for exactly what's
verified vs. what still needs a real deployment/production review.

## Stack

- Node.js 20+, TypeScript (strict), Express
- PostgreSQL + Prisma ORM
- Zod for request validation
- JWT access/refresh tokens (rotation + reuse detection), bcrypt password hashing
- Pino structured logging
- Vitest + Supertest for tests

## Getting started

```bash
npm install
cp .env.example .env   # then edit secrets/DB URL as needed
```

### Database

You need a PostgreSQL instance. Two options:

**Docker (recommended, works out of the box in GitHub Codespaces):**

```bash
docker compose up -d
npx prisma migrate deploy
npm run seed   # creates an OWNER login, default teams, a warehouse, and a default incentive rule
```

**No Docker available:** the repo includes `@electric-sql/pglite` /
`@electric-sql/pglite-socket` as dev dependencies, which run a real
Postgres-wire-protocol server backed by an embedded (WASM) Postgres — no
Docker or native install required. This is in fact how this backend's own
migrations, seed script, and full server process were verified end-to-end
(over real HTTP, not just in-process tests) while building it in a
sandboxed dev environment with no Docker available.

```bash
npm run db:local   # starts a Postgres-wire server on 127.0.0.1:55432
```

Then, in another terminal:

```bash
export DATABASE_URL="postgresql://postgres@127.0.0.1:55432/postgres?sslmode=disable&pgbouncer=true&connection_limit=5"
npx prisma migrate deploy
npm run seed
npm run dev
```

The `pgbouncer=true` flag is required against this embedded server — its
connection multiplexer collides with Prisma's named prepared statements
without it (`prepared statement "sN" already exists`). `connection_limit=5`
avoids overwhelming the multiplexer under concurrent requests. Neither flag
is needed against Docker or a real Postgres instance.

This whole path is a development/testing convenience only — use Docker or a
managed Postgres for anything that matters (staging, CI, production).

### Run

```bash
npm run dev      # tsx watch, http://localhost:4000
npm run build && npm start   # production build
```

`GET /health/live` and `GET /health/ready` are unauthenticated health checks.

## Testing

```bash
npm run test:unit          # pure logic, no DB required
npm run test:integration   # full HTTP-driven tests, requires DATABASE_URL
npm test                   # everything
```

Integration test files share one database and reset it between tests, so
Vitest is configured with `fileParallelism: false` — running them in
parallel let one file's reset truncate another file's in-flight data
(a real bug this project's own tests caught while being built).

- `tests/integration/lifecycle.test.ts` drives the entire core chain through
  the real HTTP API — login, lead, quotation, approval, order creation
  (triggers the Stock Gate), sequential fulfilment (pick → pack → label →
  handoff, including the physical stock decrement on pick and the check
  that a later stage can't complete before an earlier one), delivery
  dispatch/delay/POD, invoicing, and payment (which closes the order) —
  plus a second scenario verifying the Shortage path when stock is
  insufficient.
- `tests/integration/extendedModules.test.ts` covers notifications (lead
  assignment triggers an in-app notification), documents (rejects a
  non-URL file link), assets (create → assign → maintenance → return, and
  that a second assignment while already assigned is rejected), HR policy
  acknowledgement (and that acknowledging twice is rejected), the
  incentive report (computed from real activity/order/payment rows, not
  hardcoded), and profitability + dashboard aggregation against a real
  order.

Both files have been run successfully together against a real
Postgres-wire database, and the built server has been smoke-tested as an
actual running process (`tsx src/server.ts` over real HTTP, not just
supertest) against a seeded database.

## Architecture

```
src/
  config/env.ts        # validated environment (fails fast on boot)
  lib/                 # prisma client, jwt, password hashing, pricing,
                        # audit log, notifications, pagination, sequence
                        # numbers, authz helpers
  middleware/           # authenticate, authorize (role gate), validate, error handler
  modules/<domain>/     # schema (zod) + service (business logic + Prisma) +
                        # controller (thin HTTP glue) + routes, per domain
  app.ts / server.ts
prisma/
  schema.prisma
  migrations/
  seed.ts
tests/
  unit/                 # pure-function tests, no DB
  integration/           # full HTTP + DB tests
```

Each domain module (auth, users, teams, customers, leads, quotations,
products, warehouses, inventory, orders, vendors, purchaseOrders, logistics,
invoices, payments, notifications, documents, employees, assets,
hrPolicies, incentives, profitability, dashboard) follows the same shape.
Business logic that spans domains — the Stock Gate in particular — lives in
`src/modules/inventory/stockGate.service.ts` and is called by the modules
that need it (orders, purchaseOrders) rather than duplicated.

## Authorization model

- **Authentication**: JWT access token (short-lived) + refresh token
  (rotated on every use, reuse triggers a full session revoke), re-verified
  against the DB on every request so a suspended account or role change
  takes effect immediately.
- **Roles**: `OWNER`, `ADMIN`, `TEAM_LEAD`, `TEAM_MEMBER`, `CLIENT`.
  `requireRole`/`requireStaff`/`requireManager` middleware gate routes;
  row-level visibility (a Team Lead sees their team's leads/orders, a Team
  Member sees only what's assigned to them, a Client sees only their own
  customer's data) is enforced in the service layer via
  `src/lib/authz.ts`, never left to the frontend.
- User provisioning (creating logins, assigning roles/teams) is an
  Owner/Admin operation — there is no public self-signup, consistent with
  an internally-provisioned CRM.

## The Stock Gate

`runStockGateForOrder` (in `stockGate.service.ts`) is the concrete
implementation of the business rule: available supply = Warehouse Stock +
Store Stock + Confirmed Inbound (purchase orders sent to/confirmed by a
vendor but not yet received), checked against the requested quantity.

- Physical stock is reserved immediately where available (locking the
  relevant `StockItem` rows with `SELECT ... FOR UPDATE` inside the
  transaction, so concurrent orders can never both reserve the same units).
- Any remainder covered by confirmed inbound is left pending (no new
  Shortage) — it resolves itself as goods are received.
- Any true gap (unmet even by confirmed inbound) opens a `Shortage`, which
  Purchasing can turn into a Purchase Order; receiving goods against that PO
  re-runs the Stock Gate for every order tied to the shortage
  (`reevaluateShortagesForProduct`), so shortages resolve automatically
  instead of needing a manual re-check.
- Stock is only physically decremented (`quantityOnHand`) when it's
  actually picked (`consumeReservedStock`), keeping "reserved" and
  "physically issued" as distinct, auditable states.

## Notifications

`src/lib/notify.ts` is the single place notifications get written from
(per the workflow rules' "avoid scattering notification code across every
controller"). It's called from inside the same transaction as the event it
describes: lead assignment, quotation submitted/decided, stock shortage,
PO status change, goods received, delivery delay, POD required/uploaded.
Notifications are in-app only (`GET /notifications`) — there is no
email/SMS delivery yet. `POST /notifications/run-overdue-check` is exposed
for Accounts (or an external cron) to trigger Payment Due notifications,
since no job scheduler is wired up.

## Incentives

`POST /incentives/rules` sets the weights (`activityWeight`,
`salesClosedPct`, `collectionsPct`); `GET /incentives/report?year=&month=`
computes CRM Activity + Sales Closed + Collections **live** from
`LeadActivity`, `Order`, and `Payment` rows via `groupBy` — there is no
stored per-employee score table, so it can never drift from the source
data or need manual entry.

## Status

**Built and verified** (typecheck, lint, and the full integration suite —
2 files, both lifecycle and extended-module coverage — all pass together
against a real Postgres-wire database; the server has also been smoke-run
as an actual OS process over real HTTP):

- Foundation, Identity & Access
- Customers/Contacts, CRM (Leads + Activities), Quotations + Approval workflow
- Products/Brands, Warehouses, Inventory + Stock Gate + Shortages
- Orders + Fulfilment, Purchasing + Goods Receipt
- Logistics (dispatch/delay/POD), Invoices, Payments
- Notifications (in-app) + Documents (Google Drive link abstraction)
- People & Assets (employees, assets, assignment history, maintenance log)
- HR & Incentives (policies + acknowledgement, live incentive computation)
- Profitability (summary, by-brand, by-customer, by-segment)
- Dashboard/Reporting (command center, CRM, inventory alerts, purchase
  tracking, logistics, people & assets, HR)
- A cross-cutting Audit Log on every mutation

**Explicitly out of scope / not built:**

- Real Google Drive API integration (OAuth, actual file upload) — Documents
  currently store a validated link + metadata, which is the backend
  abstraction the workflow rules call for, but nothing calls the Drive API.
- Email/SMS notification delivery — notifications are in-app/DB only.
- A background job scheduler — the overdue-invoice check is an on-demand
  endpoint, not a cron.
- A dedicated production-hardening review pass (see
  `docs/planning/03_EXECUTION_PLAN.md` Phase 15) — load testing, a security
  audit beyond what's already built in (helmet, rate limiting, RBAC,
  parameterized queries throughout), and index tuning under real data
  volumes haven't been done.

**Not runtime-verified against a persistent/managed Postgres or in
production-like conditions** — only against the embedded PGlite
Postgres-wire server described above (real Postgres, real SQL, real
transactions/locking, but single-process and not a substitute for load
testing or staging verification).
