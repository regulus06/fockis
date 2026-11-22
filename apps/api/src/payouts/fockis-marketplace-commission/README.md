# Fockis Marketplace Commission Settings

This package adds database-managed commission settings for Fockis.

## Included
- MongoDB singleton settings document (`marketplace_commission_settings`)
- Admin GET/PATCH API
- Default, category, and store-specific rates
- Priority: store override > category override > default
- Validation from 0% through 100%
- Admin audit log (last 200 changes)
- Commission quote calculation in integer cents
- Order shipment snapshot fields and payout integration instructions

## Install / integrate

1. Copy the `schemas`, `services`, and `controllers` folders into:
   `apps/api/src/payouts/`
2. Merge `payouts.module.integration.ts` changes into your existing
   `apps/api/src/payouts/payouts.module.ts`.
3. Add the fields from `order-schema.additions.ts.txt` to `OrderShipment`
   in `apps/api/src/fockis-shop/orders/schemas/order.schema.ts`.
4. Apply `payouts-service.integration.ts.txt` to your existing
   `PayoutsService`. It deliberately describes a targeted integration rather
   than replacing your entire large service with an incomplete copy.
5. In the payment-success path, calculate and persist the commission snapshot
   if you want the rate locked at the exact time payment succeeds.

## Admin endpoints

- `GET /admin/marketplace-commission`
- `PATCH /admin/marketplace-commission`

Example PATCH body:

```json
{
  "defaultRate": 12,
  "categoryRates": [
    { "key": "electronics", "rate": 8 },
    { "key": "clothing", "rate": 10 }
  ],
  "storeRates": [
    { "key": "65f000000000000000000001", "rate": 5 }
  ],
  "isActive": true
}
```

The `key` for category rates must match the stable category identifier your
product records use. The `key` for store rates is the Store MongoDB ObjectId.

## Security notes

- The controller requires `req.user` from the existing global JWT guard and
  checks `isAdmin`, `role`, or `roles`. If your application uses different
  admin role field names, update `requireAdmin()` to match your real user model.
- Keep the route behind your normal authentication guard.
- Consider using your application's established permission guard as well.
- Do not expose PATCH to sellers or ordinary users.
- Commission is calculated on item subtotal only, matching the supplied
  PayoutsService behavior. Shipping, tax, tips, and discounts need an explicit
  accounting policy before including them.
- This is a code integration package, not a live Stripe payout test. Test in
  Stripe test mode and verify webhook delivery, refunds, disputes, transfer
  reversals, and bank payout states before enabling live payouts.
