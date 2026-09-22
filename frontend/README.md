# TILE / OS — Frontend

React + Vite + TypeScript single-page app for the TILE / OS control center,
consuming the backend in the repo root. Visual design follows the "Onyx &
Brass" reference in [../docs/planning/Tile store UI All page.pdf](../docs/planning/Tile%20store%20UI%20All%20page.pdf).

**Scope of this pass:** Auth/login, Command Center, CRM & Leads (leads,
activities, quotations, approval), Orders (fulfilment, stock gate),
Inventory & Stock Alerts, Purchasing (POs, goods receipt), Logistics
(dispatch/delay/POD). **Not built yet:** Payments, Profitability, People &
Assets, HR/Incentives — these render a "coming soon" placeholder in the nav;
their backends are already live (see the root README).

## Getting started

```bash
npm install
cp .env.example .env   # point VITE_API_URL at your running backend
npm run dev
```

Requires the backend (repo root) running and reachable at `VITE_API_URL`
(default `http://localhost:4000/api/v1`). See the root README for how to
start the backend, including a Docker-free option.

```bash
npm run build      # production build (tsc -b && vite build)
npm run lint        # oxlint
```

## Architecture

```
src/
  api/            # one file per backend domain: typed request/response
                    shapes + TanStack Query hooks (useLeads, useOrders, ...)
  auth/           # AuthContext (login/logout/silent refresh), route guards
  components/
    layout/        # Sidebar, Topbar, AppShell, nav config
    ui/            # design-system primitives: Card, KpiCard, Badge, Table,
                    # Button, Field (Input/Select/Textarea), Modal, Toast
    shared/         # cross-page pickers: CustomerPicker (+ inline create),
                    # EmployeePicker, ProductPicker
    crm/, purchasing/, logistics/   # feature-scoped compound components
                    # (e.g. NewLeadModal, NewPurchaseOrderModal)
  lib/            # apiClient (axios + auth-refresh interceptor), tokenStore,
                    # format (₹ Lakh/Crore, dates), pricing (client-side
                    # totals preview mirroring the backend), statusTone
                    # (status -> badge color mapping)
  pages/          # one file per route
  types/api.ts     # TypeScript types mirroring the backend's Prisma/API shapes
```

## Auth model

Access token lives in memory only (never `localStorage`, to limit XSS
exposure); the refresh token is persisted so a page reload can silently
re-authenticate via `POST /auth/refresh` instead of forcing a fresh login.
`apiClient`'s response interceptor retries a request once after a silent
refresh on a 401, and queues concurrent 401s onto the same in-flight
refresh call rather than firing one per request.

## Design tokens

The "Onyx & Brass" palette is defined once, in `src/index.css`, as Tailwind
v4 `@theme` CSS custom properties (`--color-ink`, `--color-brass`,
`--color-cream`, `--color-status-*`, ...). Every component references the
generated utility classes (`bg-ink`, `text-brass`, `bg-status-critical-bg`,
...) rather than hardcoding hex values, so the theme can be retuned from one
file.

## Verification status

Typecheck (`tsc -b`), lint (`oxlint`), and production build all pass. There
is no browser-automation tool available in this project's dev environment,
so the UI has **not** been visually clicked through in a real browser.
Instead, the entire core flow (login → dashboard → customer → employee
picker → lead → activity → product/brand → stock adjustment → quotation →
submit → approve → convert to order → all four fulfilment stages → delivery
→ dispatch → deliver → POD → vendor → purchase order → status transitions →
goods receipt → inventory/purchasing/logistics dashboards) was exercised
with a script hitting the exact same endpoints, request bodies, and
response fields every page/hook in this app uses, against a real
Postgres-backed instance of the backend — confirming the frontend's
TypeScript types and API calls match backend reality, not just that they
compile. That script does not exist in this repo (it was a throwaway
verification artifact); the same coverage lives in the backend's own
integration tests (`../tests/integration/`).

**What that verification does not cover:** actual rendering, CSS layout,
responsive behavior, click-through interaction, browser console errors, and
loading/error-state UX. Please click through the app locally before
treating any page as production-ready.
