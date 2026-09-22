# TILE / OS --- Ready-to-Use Agent Prompts

These are execution prompts to use after the agent has loaded the
project context and instructions.

------------------------------------------------------------------------

## Prompt 01 --- Initial Repository Audit

``` text
Read the TILE / OS project context and backend agent instructions.

Now inspect the entire existing repository.

Do not modify anything yet.

Determine:

1. Current backend framework and runtime
2. Database and ORM/data-access layer
3. Existing backend structure
4. Existing authentication
5. Existing authorization
6. Existing models
7. Existing API routes
8. Existing services
9. Existing integrations
10. Existing tests
11. Existing environment/configuration
12. What already works
13. What is missing
14. Architectural risks
15. Dependencies between modules

Then produce:

- Current Architecture
- Existing Functionality
- Missing Functionality
- Risks
- Recommended Implementation Order
- Recommended First Implementation Task

Do not write implementation code yet.
```

------------------------------------------------------------------------

## Prompt 02 --- Foundation

``` text
Implement the backend foundation based on the project context.

Only work on the foundation.

Focus on:

- Application structure
- Environment configuration
- Database connection
- Migrations
- Validation
- Error handling
- Logging
- API foundation
- Health checks
- Test foundation

Do not implement the business modules yet.

Inspect the existing repository first.

Reuse existing infrastructure where possible.

After implementation:

1. Run the application.
2. Run relevant tests/checks.
3. Fix issues.
4. Report exactly what changed.
5. Report anything that remains incomplete.
```

------------------------------------------------------------------------

## Prompt 03 --- Identity & Access

``` text
Implement the Identity & Access layer.

Build the required:

- Users
- Roles
- Teams
- Permissions
- Authentication
- Authorization
- Client accounts
- User/team relationships

Use the role hierarchy defined in the project context:

Owner
Admin
Team Lead
Team Member
Client

Test both permitted and forbidden operations.

Do not move into CRM or inventory yet.

Inspect existing authentication before replacing or extending it.
```

------------------------------------------------------------------------

## Prompt 04 --- CRM

``` text
Implement the CRM and Sales layer.

Build the complete backend workflow for:

Lead
→ Assignment
→ Activity / Follow-up
→ Quotation
→ Approval

Include:

- Leads
- Customers
- Contacts
- Sales assignment
- Activities
- Follow-ups
- Site visits / surveys
- Lost reasons
- Quotations
- Quotation items
- Approval workflow
- Approval history

Do not build fake functionality.

Test the workflow end-to-end.

Do not modify unrelated modules.
```

------------------------------------------------------------------------

## Prompt 05 --- Inventory

``` text
Implement the Products and Inventory subsystem.

Build:

- Products / SKUs
- Brands
- Variants
- Stores
- Warehouses
- Stock
- Stock movements
- Stock adjustments
- Reorder points
- Reserved stock
- Inbound stock

Then implement the Stock Gate described in the project context.

The Stock Gate must calculate availability from:

Warehouse Stock
+
Store Stock
+
Confirmed Inbound

against requested order quantity.

Handle sufficient stock and shortage scenarios.

Pay special attention to concurrency and double reservation.

Test the business logic thoroughly.
```

------------------------------------------------------------------------

## Prompt 06 --- Orders

``` text
Implement Orders and Fulfilment.

Connect:

Approved Quotation
→ Order
→ Stock Gate
→ Reservation
→ Fulfilment

Build:

- Orders
- Order items
- Order lifecycle
- Stock requirements
- Picking
- Packing
- Labelling
- Warehouse handoff

Do not bypass Stock Gate logic.

Test the entire order flow.
```

------------------------------------------------------------------------

## Prompt 07 --- Purchasing

``` text
Implement Purchasing and Goods Receiving.

Build:

- Vendors
- Purchase Orders
- PO items
- Vendor confirmation
- ETA
- PO status
- Goods receiving
- Inbound inventory

Connect purchasing to the existing shortage and inventory logic.

Test:

Order shortage
→ PO
→ Goods received
→ Inventory updated
→ Shortage re-evaluated

Do not create a disconnected purchasing module.
```

------------------------------------------------------------------------

## Prompt 08 --- Logistics

``` text
Implement Logistics.

Build:

- Deliveries
- Trucks / vehicles
- Dispatch
- ETA
- Delivery status
- Delay handling
- POD

Connect deliveries to orders.

Test:

Order
→ Dispatch
→ In Transit
→ Delivered
→ POD

Also test delayed delivery behavior.
```

------------------------------------------------------------------------

## Prompt 09 --- Accounts

``` text
Implement Accounts and Payments.

Build:

- Invoices
- Invoice items
- Payments
- Receivables
- Due dates
- Collections
- Payment status

Maintain real financial records.

Connect:

Customer
→ Order
→ Invoice
→ Payment

Do not implement payment status as a simple boolean-only system.
```

------------------------------------------------------------------------

## Prompt 10 --- Notifications & Documents

``` text
Implement the cross-cutting notification and document systems.

Build:

- Notification model
- Notification service
- Event-driven notification triggers
- Document abstraction
- File metadata
- Google Drive integration layer

Support important events such as:

- Task Assigned
- Approval Needed
- Stock Shortage
- PO Update
- Delivery Delay
- POD Required
- POD Uploaded
- Payment Due

Ensure file-upload state requires a real file/link.
```

------------------------------------------------------------------------

## Prompt 11 --- People & Assets

``` text
Implement People & Assets.

Build:

- Employees
- Teams
- Assets
- Asset assignments
- Asset status
- Maintenance
- Asset history

Connect assets to employees/teams appropriately.

Do not implement HR incentives yet.
```

------------------------------------------------------------------------

## Prompt 12 --- HR & Incentives

``` text
Implement HR & Incentives.

Build:

- HR policies
- Policy acknowledgements
- Performance records
- Incentive rules
- Daily performance score
- Incentive calculations
- Monthly summaries

The current product concept calculates incentives from:

CRM activity
+
Sales closed
+
Collections

Keep the calculation logic explicit and maintainable.

Do not hardcode individual employee results.
```

------------------------------------------------------------------------

## Prompt 13 --- Dashboard APIs

``` text
Now build the backend aggregation/query layer required by the TILE / OS dashboard references.

Support data for:

- Command Center
- CRM & Leads
- Inventory & Stock Alerts
- Purchase Tracking
- Logistics Tracker
- People & Assets
- HR & Incentives
- Profitability

Do not hardcode dashboard metrics.

All values must derive from actual backend data.

Optimize queries where necessary.

Keep aggregation logic separate from basic CRUD operations.
```

------------------------------------------------------------------------

## Prompt 14 --- Full Integration Test

``` text
Perform a full backend integration review.

Trace the complete business lifecycle:

Lead
→ Quotation
→ Approval
→ Order
→ Stock Gate
→ Reservation OR Shortage
→ Purchase
→ Goods Receipt
→ Fulfilment
→ Dispatch
→ Delivery
→ POD
→ Invoice
→ Payment

Verify that the modules actually communicate correctly.

Identify broken relationships, missing events, authorization gaps, inconsistent statuses, race conditions and missing error handling.

Fix issues you find.

Do not merely report obvious problems if you can safely fix them.
```

------------------------------------------------------------------------

## Prompt 15 --- Production Readiness Review

``` text
Perform a production-readiness review of the backend.

Check:

- Authentication
- Authorization
- Data isolation
- Input validation
- Error handling
- Logging
- Secrets
- File security
- Database constraints
- Indexes
- Transactions
- Concurrency
- API consistency
- Tests
- Performance
- External integrations
- Migration safety

Do not rewrite working architecture unnecessarily.

Produce:

1. Critical issues
2. Important issues
3. Minor issues
4. Fixes performed
5. Remaining risks
6. Final backend readiness assessment
```
