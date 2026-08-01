# Drinks + Utility Bills — Design

**Date:** 2026-08-01  
**Status:** Ready for implementation planning  
**Scope:** Simple v1 — both modules, no OCR, no member credit tab, no recipes

## Goals

1. **Utility bills (eau / électricité / gaz)** — admin records bills, lists them, sees monthly total.
2. **Drinks** — admin manages products + stock, records sales, sees simple drinks revenue.
3. Keep multi-tenant (`gymId`) and TND / FR+AR patterns consistent with the rest of the app.
4. Admin-only for v1 (staff can sell drinks later if needed).

## Non-goals (v1)

- Bill photo OCR / PDF parsing  
- Member “on credit” drink tabs  
- Supplier management / purchase orders  
- Complex inventory (variants, recipes, multi-warehouse)  
- Mobile API parity (web first; API later)  
- Automatic link to subscription payments  

## SaaS gating (recommended)

| Feature | Starter | Growth | Pro |
|---------|---------|--------|-----|
| Utility bills | ✓ | ✓ | ✓ |
| Drinks stock + sales | — | ✓ | ✓ |

Rationale: every salle has charges; bar is an upsell for Growth+.

## Module A — Utility bills

### Concepts

- One row per bill: type (`WATER` | `ELECTRICITY` | `GAS`), period (month), amount TND, due date, paid flag, optional note.
- List + filter by type / month.
- Summary: total for selected month; breakdown by type.

### Data

```
UtilityBill
  id, gymId
  type: WATER | ELECTRICITY | GAS
  periodMonth: Date   // first day of month (UTC noon or date-only convention)
  amount: Decimal
  dueDate: Date?
  paidAt: Date?       // null = unpaid
  note: String?
  recordedById: User
  createdAt
```

### UI

- Nav (admin): **Charges** → `/bills`
- Form: create / edit / mark paid  
- Table + month picker + totals card  

## Module B — Drinks

### Concepts

- **Product**: name, sell price, cost (optional), stock qty, active flag.
- **Sale**: sell N units → decrease stock, record revenue line (cash/other method reuse `PaymentMethod` or a small `DrinkSale` model).
- Stock adjust: restock (+qty) without a full purchasing module.
- Revenue: sum of sales in month (and today).

### Data

```
DrinkProduct
  id, gymId
  name, sellPrice, costPrice?
  stockQty: Int
  active: Boolean
  createdAt, updatedAt
  @@unique([gymId, name])

DrinkSale
  id, gymId, productId
  quantity: Int
  unitPrice: Decimal   // snapshot at sale time
  total: Decimal
  method: PaymentMethod
  soldAt: DateTime
  recordedById: User
  note?
```

### UI

- Nav (admin, Growth+): **Boissons** → `/drinks`
- Tabs or sections: Products | Sell | Sales history  
- Sell form: product, qty, method → confirm (block if stock < qty)  
- Restock action on product  

## Dashboard hooks (light)

- Admin dashboard cards (optional in same phase or follow-up):  
  - Charges du mois  
  - Recettes boissons du mois  

## Roles

- **ADMIN**: full access to bills + drinks (if plan allows).  
- **STAFF**: no access in v1 (hide nav).  

## Success criteria

- Admin can log 3 bill types and see monthly total.  
- Admin can create drink products, restock, sell, and see revenue; stock never goes negative.  
- Starter cannot open `/drinks` (upgrade message).  
- FR + AR strings for new UI.  
- Unit tests for stock decrement and bill month aggregation.  
