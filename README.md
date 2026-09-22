# TILE / OS — Backend

Backend for TILE / OS, a tile-store business operating system connecting CRM,
quotations, orders, inventory, purchasing, logistics, and accounts into one
system. See [docs/planning/](docs/planning/) for the original product
context, workflow rules, and execution plan this backend was built against.

**Scope of this pass:** the full Lead → Quotation → Approval → Order →
Stock Gate → Purchasing → Logistics → Accounts chain (Phases 0–9 of the
execution plan). **Not yet built:** Documents/Notifications integration
(Google Drive, email), People & Assets, HR & Incentives, Profitability
views, Dashboard/Reporting aggregation APIs, and the final hardening pass —
see [Status](#status) below.

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
npm run seed   # creates an OWNER login, default teams, and a warehouse
```

**No Docker available:** the repo includes `@electric-sql/pglite` /
`@electric-sql/pglite-socket` as dev dependencies, which run a real
Postgres-wire-protocol server backed by an embedded (WASM) Postgres — no
Docker or native install required. This was in fact how this backend's own
integration tests were verified end-to-end in this project's sandboxed dev
environment.

```bash
npm run db:local   # starts a Postgres-wire server on 127.0.0.1:55432
# in another terminal, with DATABASE_URL=postgresql://postgres@127.0.0.1:55432/postgres?sslmode=disable
npx prisma migrate deploy
```

This is a development/testing convenience only — use Docker or a managed
Postgres for anything that matters (staging, CI, production).

### Run

```bash
npm run dev      # tsx watch, http://localhost:4000
npm run build && npm start   # production build
```

`GET /health/live` and `GET /health/ready` are unauthenticated health checks.

## Testing

```bash
npm run test:unit          # pure logic, no DB required
npm run test:integration   # full HTTP-driven lifecycle test, requires DATABASE_URL
npm test                   # everything
```

`tests/integration/lifecycle.test.ts` drives the entire chain through the
real HTTP API — login, lead, quotation, approval, order creation (which
triggers the Stock Gate), sequential fulfilment (pick/pack/label/handoff,
including the physical stock decrement on pick and the check that a later
stage can't complete before an earlier one), delivery dispatch/delay/POD,
invoicing, and payment (which closes the order) — plus a second scenario
verifying the Shortage path when stock is insufficient. It has been run
successfully against a real Postgres-wire database as part of building this
backend.

## Architecture

```
src/
  config/env.ts        # validated environment (fails fast on boot)
  lib/                 # prisma client, jwt, password hashing, pricing,
                        # audit log, pagination, sequence numbers, authz helpers
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
  integration/           # full HTTP + DB lifecycle tests
```

Each domain module (auth, users, teams, customers, leads, quotations,
products, warehouses, inventory, orders, vendors, purchaseOrders, logistics,
invoices, payments) follows the same shape. Business logic that spans
domains — the Stock Gate, in particular — lives in
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

## Status

**Built and verified** (typecheck, lint, and the full integration test all
pass): Foundation, Identity & Access, Customers/Contacts, CRM (Leads +
Activities), Quotations + Approval workflow, Products/Brands, Warehouses,
Inventory + Stock Gate + Shortages, Orders + Fulfilment, Purchasing + Goods
Receipt, Logistics (dispatch/delay/POD), Invoices, Payments, and a
cross-cutting Audit Log.

**Deliberately not built in this pass** (see
`docs/planning/03_EXECUTION_PLAN.md` Phases 10–15): Google Drive
document integration and a real notification/event delivery system (a
`recordAudit` call happens on every mutation, which a notification service
can subscribe to later, but no notifications are actually sent yet), People
& Assets, HR & Incentives, Profitability views, Dashboard/Reporting
aggregation APIs, and a dedicated production-hardening review pass.

**Not runtime-verified against a persistent/managed Postgres or in
production-like conditions** — only against the embedded PGlite
Postgres-wire server described above (real Postgres, real SQL, real
transactions/locking, but single-process and not a substitute for load
testing or staging verification).
