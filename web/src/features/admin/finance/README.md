# Fockis Finance Admin

Central financial administration for the Fockis platform.

## Structure

- Payments
- Seller payouts
- Refunds
- Subscriptions
- Invoices
- Revenue
- Fees
- Wallets
- Coins
- Financial reports
- Shop order financial reconciliation

## Shop → Finance flow

For a Fockis Shop order:

```text
Shop → Order #12345
             │
             └── $89.99
                    │
                    ▼
               Finance
                    │
             ┌──────┴──────┐
             │             │
          Payment       Seller payout
          $89.99          $82.00
             │
          Fockis fee
            $7.99
```

The accounting invariant is:

`customer payment = seller payout + Fockis fee`

Example:

`$89.99 = $82.00 + $7.99`

## Frontend mounting

Mount `FinanceAdminRoutes` at `/admin/finance/*`.

## Expected NestJS endpoints

- GET `/api/admin/finance/overview`
- GET `/api/admin/finance/transactions`
- GET `/api/admin/finance/shop/orders/:orderId/finance`
- GET `/api/admin/finance/revenue`
- GET `/api/admin/finance/fees`
- GET `/api/admin/finance/invoices`
- GET `/api/admin/finance/wallets`
- GET `/api/admin/finance/coins`
- GET `/api/admin/finance/reports`
- GET `/api/admin/finance/payouts`
- POST `/api/admin/finance/payouts/:id/approve`
- POST `/api/admin/finance/payouts/:id/cancel`
- GET `/api/admin/finance/refunds`
- POST `/api/admin/finance/refunds/:id/approve`
- POST `/api/admin/finance/refunds/:id/reject`
- GET `/api/admin/finance/subscriptions`
- POST `/api/admin/finance/subscriptions/:id/cancel`
- POST `/api/admin/finance/subscriptions/:id/reactivate`

The exact backend route can be adapted to your existing NestJS controllers instead of creating duplicate payment logic.
