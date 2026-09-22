# TILE / OS --- Backend Workflow & Business Rules

## 1. Core Lifecycle

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

Every transition should be represented by real backend state and, where
appropriate, an event.

------------------------------------------------------------------------

# 2. Lead Rules

A lead should have:

-   Customer reference
-   Assigned salesperson
-   Status
-   Activities
-   Follow-ups
-   Created/updated timestamps
-   Lost reason where applicable

A lead can progress toward a quotation.

A lost lead should preserve its reason.

------------------------------------------------------------------------

# 3. Quotation Rules

A quotation may contain:

-   Customer
-   Salesperson
-   Items
-   Quantities
-   Pricing
-   Discounts
-   Taxes where applicable
-   Total
-   Terms
-   Status
-   Approval information

Approval must be permission controlled.

Approval should record:

-   Approver
-   Time
-   Decision
-   Relevant change/history where needed

------------------------------------------------------------------------

# 4. Order Rules

An order should connect to:

-   Customer
-   Quotation
-   Salesperson
-   Order items
-   Product/SKU
-   Quantity
-   Price
-   Payment terms
-   Stock requirements
-   Fulfilment
-   Delivery
-   Invoice
-   Payments

An order should not become fulfilable simply because its status was
manually changed.

Required business conditions should be checked.

------------------------------------------------------------------------

# 5. Stock Gate

## Input

``` text
Order Item
Requested Quantity
```

## Supply

``` text
Warehouse Stock
+
Store Stock
+
Confirmed Inbound
```

## Decision

``` text
IF Supply >= Requested Quantity
    → Stock Available
    → Reserve / Allocate
    → Continue Fulfilment

ELSE
    → Shortage
    → Calculate Shortfall
    → Notify Sales / Warehouse / Purchase
    → Purchasing process
```

------------------------------------------------------------------------

# 6. Stock Reservation

Differentiate:

``` text
Physical Stock
Available Stock
Reserved Stock
Inbound Stock
```

Do not treat them as the same number.

Reservations must prevent multiple orders from consuming the same
available stock.

Use appropriate transaction/locking mechanisms where necessary.

------------------------------------------------------------------------

# 7. Shortage

A shortage should contain enough information to explain:

-   Order
-   Product
-   Requested quantity
-   Available quantity
-   Shortfall
-   Status
-   Related purchase order
-   Resolution

The shortage should be re-evaluated after inventory changes.

------------------------------------------------------------------------

# 8. Purchase Order

A purchase order may track:

-   Vendor
-   Items
-   Quantity
-   ETA
-   Confirmation
-   Status
-   Received quantity

The PO should connect to the inventory flow.

------------------------------------------------------------------------

# 9. Goods Receipt

When goods are received:

``` text
PO
→ Goods Receipt
→ Inventory Movement
→ Stock Updated
→ Related Shortages Re-evaluated
```

Do not update inventory without an auditable movement/receipt where the
architecture requires one.

------------------------------------------------------------------------

# 10. Fulfilment

Fulfilment can include:

``` text
Pick
→ Pack
→ Label
→ Warehouse Handoff
```

The backend should prevent invalid transitions where required
prerequisites are missing.

------------------------------------------------------------------------

# 11. Dispatch

Dispatch connects:

``` text
Order
→ Delivery
→ Truck / Route
→ ETA
```

------------------------------------------------------------------------

# 12. Delivery

A delivery may have:

-   Order
-   Truck
-   Destination
-   ETA
-   Status
-   Delay information
-   POD

Important state changes should create backend events.

------------------------------------------------------------------------

# 13. Delay

When a delivery becomes delayed:

``` text
Delivery Status
→ Delayed
→ Delay Event
→ Notification
```

Relevant users/teams should be notified according to authorization and
workflow rules.

------------------------------------------------------------------------

# 14. POD

POD must have:

-   Delivery reference
-   File/link
-   Uploaded by
-   Uploaded timestamp
-   Status

Important rule:

``` text
No valid file/link
=
POD is not uploaded
```

Do not mark POD complete simply by toggling a boolean.

------------------------------------------------------------------------

# 15. Invoice

Invoices should reference the appropriate customer/order context.

Track:

-   Invoice number
-   Customer
-   Order
-   Items
-   Amount
-   Due date
-   Status
-   Created date

------------------------------------------------------------------------

# 16. Payments

A payment should be a real record.

Track:

-   Customer
-   Invoice/order
-   Amount
-   Payment date
-   Payment method where required
-   Reference
-   Status

Do not store only:

``` text
payment_status = "paid"
```

without maintaining the underlying financial record.

------------------------------------------------------------------------

# 17. Notifications

Notifications should be event-driven where appropriate.

Examples:

``` text
Lead Assigned
→ Salesperson notified

Approval Needed
→ Approver notified

Stock Shortage
→ Sales + Warehouse + Purchase notified

PO Update
→ Relevant operational users notified

Delivery Delay
→ Sales + Client + Finance notified where applicable

POD Required
→ Relevant user notified

Payment Due
→ Accounts / responsible users notified
```

Avoid scattering notification code across every controller.

------------------------------------------------------------------------

# 18. Audit Log

Audit important actions.

At minimum consider:

-   User
-   Entity
-   Action
-   Timestamp
-   Previous value
-   New value
-   Context

Important actions include:

-   Approval
-   Order creation
-   Status changes
-   Stock reservation
-   Stock adjustment
-   PO creation
-   Goods receipt
-   Invoice creation
-   Payment
-   Delivery status
-   POD upload
-   Permission changes

------------------------------------------------------------------------

# 19. Client Isolation

Clients must only access their own:

-   Account
-   Quotations
-   Orders
-   Payment records
-   Deliveries
-   Invoices
-   Warranty
-   Support tickets

Never trust a client-provided ID without checking ownership.

------------------------------------------------------------------------

# 20. Cross-Module Integrity

The backend must maintain these relationships:

``` text
Customer
    ↓
Lead
    ↓
Quotation
    ↓
Order
    ↓
Stock
    ↓
Purchase
    ↓
Fulfilment
    ↓
Delivery
    ↓
POD
    ↓
Invoice
    ↓
Payment
```

The exact data model may differ, but the business relationships must
remain intact.

------------------------------------------------------------------------

# 21. Event Mindset

Important business events may include:

``` text
LeadCreated
LeadAssigned
QuotationCreated
QuotationApproved
OrderConfirmed
StockShortageDetected
StockReserved
PurchaseOrderCreated
GoodsReceived
DeliveryDispatched
DeliveryDelayed
DeliveryCompleted
PODUploaded
InvoiceCreated
PaymentReceived
```

Use events to decouple:

-   Notifications
-   Audit logs
-   Automation
-   Analytics

Do not introduce a complex event bus unless the project actually needs
one.
