# Release Notes — Sprint 12B

## Billing, Payments & Subscription Management

Commercial billing layer on top of Sprint 12A (auth / licensing / entitlements).

### Delivered
- Payment provider abstraction (`PaymentProvider`) with Razorpay + Stripe; stubs for PayPal / Paddle / LemonSqueezy
- Gateway manager, sandbox checkout, live API routes (`/api/billing/checkout`, `/refund`, webhooks)
- Billing dashboard, payment methods, invoices (GST), usage, coupons, referral, upgrade history
- Subscription lifecycle (free → trial → active → grace → past_due → cancelled / expired / suspended / reactivated)
- Invoice engine with CGST / SGST / IGST, coupon engine, referral wallet, usage quotas
- Refunds, transaction history, revenue analytics (MRR / ARR / churn / ARPU / LTV)
- Admin billing console at `/admin/billing`
- Secure webhook signature verification + idempotent duplicate protection
- Secrets never exposed to the client (live keys only on server routes)

### Routes
- Settings: `/settings/subscription/{billing,payment-methods,invoices,usage,coupons,referral,upgrade-history}`
- Admin: `/admin/billing`
- API: `/api/billing/checkout`, `/api/billing/refund`, `/api/billing/webhooks/{razorpay,stripe}`

### Env (optional — sandbox without keys)
```
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

### Out of scope
Live brokerage, exchange payments, trading wallet, portfolio cash ledger, admin CRM, marketing automation
