# TILE / OS --- Backend Execution Plan

## Goal

Build the backend incrementally so that the final system supports the
complete business lifecycle without creating disconnected CRUD modules.

------------------------------------------------------------------------

# Phase 0 --- Repository Audit

## Objective

Understand the existing project before writing new code.

### Tasks

-   Inspect repository structure.
-   Identify backend framework.
-   Identify runtime.
-   Identify database.
-   Identify ORM/data-access layer.
-   Identify authentication.
-   Identify authorization.
-   Identify API routes.
-   Identify models.
-   Identify services.
-   Identify configuration.
-   Identify tests.
-   Identify integrations.
-   Identify technical debt.

### Deliverable

Create a concise:

``` text
Current Architecture
Existing Functionality
Missing Functionality
Risks
Dependencies
Recommended Build Order
```

Do not make major modifications during this audit.

------------------------------------------------------------------------

# Phase 1 --- Backend Foundation

## Build

-   Application configuration
-   Environment handling
-   Database connection
-   Migration system
-   Error handling
-   Validation
-   Logging
-   API foundation
-   Basic health checks
-   Test foundation

## Completion Check

The application should start reliably and connect to its required
infrastructure.

------------------------------------------------------------------------

# Phase 2 --- Identity & Access

## Build

-   Users
-   Roles
-   Teams
-   Permissions
-   User-team relationships
-   Client accounts
-   Authentication
-   Authorization
-   Account status
-   Session/token handling

## Required Access Model

``` text
OWNER
ADMIN
TEAM LEAD
TEAM MEMBER
CLIENT
```

## Completion Check

Verify both:

``` text
Allowed actions
```

and:

``` text
Forbidden actions
```

------------------------------------------------------------------------

# Phase 3 --- CRM & Sales

## Build

-   Leads
-   Customers
-   Contacts
-   Sales assignments
-   Activities
-   Follow-ups
-   Site visits / surveys
-   Lost reasons
-   Quotations
-   Quotation items
-   Quote approval
-   Approval history

## Main Flow

``` text
Lead
→ Assignment
→ Follow-up
→ Quotation
→ Approval
```

## Completion Check

A lead should be able to progress through the CRM workflow without fake
data.

------------------------------------------------------------------------

# Phase 4 --- Products & Inventory

## Build

-   Products
-   SKUs
-   Brands
-   Variants
-   Sizes/specifications
-   Stores
-   Warehouses
-   Stock
-   Stock movements
-   Stock adjustments
-   Reorder points
-   Reservations
-   Inbound stock

------------------------------------------------------------------------

# Phase 5 --- Stock Gate

## Core Logic

Calculate:

``` text
Available Supply
=
Warehouse Stock
+
Store Stock
+
Confirmed Inbound
```

Compare against:

``` text
Requested Quantity
```

### If enough stock

``` text
Reserve / Allocate
→ Continue Fulfilment
```

### If insufficient

``` text
Create Shortage
→ Notify Relevant Teams
→ Purchase
→ Receive Goods
→ Update Inventory
→ Recalculate
```

## Important

This must be backend-owned logic.

It must handle concurrent requests safely.

------------------------------------------------------------------------

# Phase 6 --- Orders & Fulfilment

## Build

-   Orders
-   Order items
-   Order lifecycle
-   Order/quotation relationship
-   Payment terms
-   Stock requirements
-   Picking
-   Packing
-   Labelling
-   Warehouse handoff
-   Fulfilment status

## Main Flow

``` text
Approved Quotation
→ Order
→ Stock Gate
→ Reservation
→ Fulfilment
```

------------------------------------------------------------------------

# Phase 7 --- Purchasing

## Build

-   Vendors
-   Purchase orders
-   PO items
-   Vendor confirmation
-   ETA
-   PO statuses
-   Goods receiving
-   Inbound stock

## Main Flow

``` text
Shortage
→ PO
→ Vendor ETA
→ Goods Received
→ Inventory Updated
→ Shortage Re-evaluated
```

------------------------------------------------------------------------

# Phase 8 --- Logistics

## Build

-   Delivery
-   Trucks / vehicles
-   Routes
-   Driver references where applicable
-   Dispatch
-   ETA
-   Delivery status
-   Delay events
-   POD

## Main Flow

``` text
Fulfilled Order
→ Dispatch
→ In Transit
→ Delivered
→ POD
```

------------------------------------------------------------------------

# Phase 9 --- Accounts

## Build

-   Invoices
-   Invoice items
-   Payments
-   Receivables
-   Due dates
-   Collections
-   Payment status

## Main Relationship

``` text
Customer
→ Order
→ Invoice
→ Payment
```

------------------------------------------------------------------------

# Phase 10 --- Documents & Notifications

## Build

-   Document abstraction
-   File metadata
-   Google Drive integration
-   Notification model
-   Notification service
-   Notification events
-   In-app notifications
-   Email notifications where required

## Important Events

-   Task Assigned
-   Approval Needed
-   Stock Shortage
-   PO Update
-   Goods Received
-   Delivery Delay
-   POD Required
-   POD Uploaded
-   Payment Due

------------------------------------------------------------------------

# Phase 11 --- People & Assets

## Build

-   Employees
-   Teams
-   Assets
-   Asset assignments
-   Asset status
-   Maintenance
-   Asset history

------------------------------------------------------------------------

# Phase 12 --- HR & Incentives

## Build

-   HR policies
-   Policy acknowledgements
-   Performance records
-   Incentive rules
-   Daily score
-   Incentive calculations
-   Monthly summaries

The incentive logic should be explicit and maintainable.

------------------------------------------------------------------------

# Phase 13 --- Profitability

## Build

-   Revenue calculations
-   Cost calculations
-   Gross margin
-   Profitability views
-   Brand analysis
-   Customer analysis
-   Architect/builder dimensions where available

Do not hardcode percentages.

------------------------------------------------------------------------

# Phase 14 --- Dashboard & Reporting APIs

Only after the underlying modules work.

Build backend services for:

-   Command Center
-   Sales Tracker
-   Inventory Alerts
-   Purchase Tracking
-   Logistics Tracker
-   People & Assets
-   HR & Incentives
-   Profitability

All metrics must derive from actual data.

------------------------------------------------------------------------

# Phase 15 --- Hardening

## Security

Review:

-   Authentication
-   Authorization
-   Tenant/account isolation
-   File access
-   Input validation
-   Secret handling
-   API abuse

## Data

Review:

-   Constraints
-   Indexes
-   Transactions
-   Concurrency
-   Migration safety

## Quality

Review:

-   Tests
-   Error handling
-   Logging
-   API consistency
-   Regression risks

## Performance

Review:

-   Slow queries
-   N+1 queries
-   Large responses
-   Unnecessary database calls

------------------------------------------------------------------------

# Recommended Build Dependency

``` text
Foundation
    ↓
Identity & Access
    ↓
CRM
    ↓
Products / Inventory
    ↓
Orders
    ↓
Stock Gate
    ↓
Purchasing
    ↓
Fulfilment
    ↓
Logistics
    ↓
Accounts
    ↓
Documents / Notifications
    ↓
People / Assets
    ↓
HR / Incentives
    ↓
Profitability
    ↓
Dashboard / Reporting
    ↓
Hardening
```

Do not skip ahead just because a UI screen exists.

Build the underlying business capability first.
