# TILE / OS --- Project Context

## 1. Product Identity

**Product:** TILE / OS\
**Type:** Tile-store business operating system\
**Current scope:** Backend development\
**Primary purpose:** Connect CRM, sales, quotations, orders, inventory,
purchasing, logistics, payments, profitability, people/assets, and
HR/incentives into one connected operational system.

This backend is intended to support the supplied workflow map and the
supplied TILE / OS UI references.

------------------------------------------------------------------------

## 2. Product Mental Model

The system is not a collection of independent CRUD modules.

The core business chain is:

``` text
Lead
  ↓
Quotation
  ↓
Approval
  ↓
Order
  ↓
Stock Gate
  ↓
Fulfilment
  ↓
Purchase if required
  ↓
Dispatch
  ↓
Delivery
  ↓
POD
  ↓
Invoice
  ↓
Payment
  ↓
Profitability
```

Cross-cutting capabilities:

``` text
Authentication
Authorization
Notifications
Audit Logs
Documents
Activity History
Business Events
```

The backend must preserve these relationships.

------------------------------------------------------------------------

## 3. Organizational Hierarchy

The system contains these access levels:

-   Owner
-   Admin / Branch Manager
-   Team Lead
-   Team Member
-   Client

### Visibility model

  Role          Access
  ------------- ---------------------------------------
  Owner         Entire organization and every module
  Admin         All teams' tasks, approvals and stock
  Team Lead     Own tasks + their team's tasks
  Team Member   Tasks assigned to them
  Client        Own order and account data only

Authorization must be enforced by the backend.

Frontend visibility is never a security mechanism.

------------------------------------------------------------------------

## 4. Employee Teams

The operational teams are:

1.  Sales Executive
2.  Warehouse Staff
3.  Purchase Team
4.  Accounts Team
5.  Delivery Team

### Sales

-   Receive incoming leads
-   Add customers
-   Site visit / survey
-   Prepare quotations
-   Send quotations
-   Follow-up calls

### Warehouse

-   Pick items
-   Update stock counts
-   Pack and label
-   Hand off for dispatch
-   Periodic stock audit

### Purchase

-   Create purchase orders
-   Receive goods / GRN
-   Supplier follow-up
-   Handle inbound stock

### Accounts

-   Match invoice to PO
-   Record payments
-   Generate invoices
-   Track receipts
-   Outstanding reports

### Delivery

-   Dispatch shipment
-   Track delivery status
-   Collect POD
-   Update client status

------------------------------------------------------------------------

## 5. Core Workflow

The workflow is:

``` text
LEAD IN
→ QUOTE & APPROVE
→ ORDER CONFIRMED
→ STOCK GATE
→ FULFILMENT
→ DISPATCH
→ DELIVERY
→ CLOSED
```

### Lead In

Client details are captured.

### Quote & Approve

Quotation is prepared and admin approval is required.

### Fulfilment

Items are picked, packed, or purchased if stock is insufficient.

### Dispatch

The order is on its way to the client.

### Closed

The business process reaches the delivered/paid end state.

------------------------------------------------------------------------

## 6. Common Task Statuses

The workflow reference defines:

-   Yet to Start
-   In Progress
-   Changes Required
-   Approval Pending
-   Completed

Use these consistently where they apply.

Do not force every business entity into the same state machine.

------------------------------------------------------------------------

## 7. Client Portal Scope

The client-facing system includes:

-   Dashboard
-   Quotations
-   Orders
-   Payment Status
-   Delivery Tracking
-   Invoices
-   Warranty
-   Support Ticket

Clients should only access their own account and order data.

------------------------------------------------------------------------

## 8. File Rules

Supported file categories include:

-   Raw Videos
-   Edited Videos
-   Images
-   Documents
-   Marketing Creatives

The workflow reference specifies Google Drive as the shared source of
truth for uploads.

The backend should abstract storage behind a service layer.

A file-upload state must not be marked as complete when there is no
actual file/link.

------------------------------------------------------------------------

## 9. Main Backend Domains

The intended backend domains are:

-   Identity & Access
-   CRM & Leads
-   Customers & Contacts
-   Quotations
-   Orders
-   Products / SKUs
-   Inventory
-   Warehouses / Stores
-   Stock Reservations
-   Stock Alerts
-   Purchasing
-   Vendors
-   Goods Receiving
-   Fulfilment
-   Logistics
-   Deliveries
-   POD
-   Invoices
-   Payments
-   Profitability
-   People & Assets
-   HR & Policies
-   Incentives
-   Notifications
-   Documents
-   Audit Logs
-   Dashboard / Reporting

------------------------------------------------------------------------

## 10. Important Business Rule: Stock Gate

Stock availability must consider:

``` text
Warehouse Stock
+
Store Stock
+
Confirmed Inbound
```

against the requested order quantity.

If sufficient:

``` text
Reserve / Allocate Stock
```

If insufficient:

``` text
Create Shortage
→ Notify relevant teams
→ Purchase
→ Receive Goods
→ Update Inventory
→ Re-evaluate Shortage
```

The frontend must not own this logic.

The backend is responsible for determining stock availability.

------------------------------------------------------------------------

## 11. Important Business Rule: Purchasing Feedback

Purchase orders are connected to stock availability.

A typical flow is:

``` text
Order Shortage
→ Purchase Order
→ Vendor ETA
→ Goods Received
→ Inventory Updated
→ Shortage Re-evaluated
```

Receiving goods should automatically affect the relevant stock
condition.

------------------------------------------------------------------------

## 12. Logistics

Logistics supports:

-   Trucks / vehicles
-   Deliveries
-   Destinations
-   ETA
-   Delivery status
-   Delays
-   POD

Typical states include:

-   In Transit
-   On Time
-   Delayed
-   Delivered
-   POD Pending
-   POD Uploaded

A delivery belongs to an order.

------------------------------------------------------------------------

## 13. Financial Chain

The backend should maintain real financial records rather than storing
payment status as a simple flag.

Conceptually:

``` text
Customer
→ Order
→ Invoice
→ Payment
```

Financial functionality includes:

-   Invoices
-   Payments
-   Receivables
-   Due dates
-   Collections
-   Payment status

------------------------------------------------------------------------

## 14. People & Assets

The system includes:

-   Employees
-   Teams
-   Assets
-   Asset assignment
-   Maintenance
-   Asset status

Assets may include:

-   Vehicles
-   Laptops
-   Forklifts
-   Tools
-   Devices

Assets should have a traceable lifecycle.

------------------------------------------------------------------------

## 15. HR & Incentives

The UI reference includes:

-   HR policies
-   Policy acknowledgements
-   Staff performance
-   Incentives
-   Daily score
-   Monthly incentive totals

The displayed incentive concept uses:

``` text
CRM Activity
+
Sales Closed
+
Collections
```

The implementation should keep incentive calculations explicit and
maintainable.

------------------------------------------------------------------------

## 16. Dashboard Domains

The UI references these operational views:

-   Command Center
-   CRM & Leads
-   Inventory & Stock Alerts
-   Purchase Tracking
-   Logistics Tracker
-   People & Assets
-   HR & Incentives

Dashboard numbers must come from actual backend data.

Do not hardcode business metrics into dashboard APIs.

------------------------------------------------------------------------

## 17. Core Principle

TILE / OS should behave as one connected business operating system.

Build the backend around:

``` text
DATA
+
BUSINESS RULES
+
WORKFLOWS
+
PERMISSIONS
+
EVENTS
+
INTEGRATIONS
+
AUDITABILITY
```
