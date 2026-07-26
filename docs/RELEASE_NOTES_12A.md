# Release Notes — Sprint 12A

## Subscription, Authentication & Licensing Platform

Local-first SaaS foundation for EquityOS (**no payment gateway** — Sprint 12B).

### Delivered
- Auth: login, signup, forgot/reset password, verify email, remember me, session refresh/timeout, logout
- Protected settings routes (middleware cookie + `ProtectedRoute`)
- Settings: Profile, Security, Subscription, Devices, Notifications, Appearance, Research, API Keys placeholder
- Plans: Free, Starter, Professional, Institutional, Enterprise
- License engine: generate, validate, grace, revoke, transfer hooks, seats
- Roles: Owner, Admin, Research Analyst, Portfolio Manager, Viewer
- Permission + feature gating engines with upgrade overlays / trial banners
- Device registry + login history
- Demo account: `analyst@equityos.demo` / `EquityOS!demo` (Professional 14-day trial)

### Routes
`/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`, `/settings/*`

### Out of scope (12B)
Razorpay/Stripe, webhooks, invoices, GST, coupons, referrals, admin billing
