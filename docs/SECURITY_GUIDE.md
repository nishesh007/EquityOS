# Security Guide — EquityOS

Sprint 12C hardening summary.

## Headers (middleware)
- Content-Security-Policy (default-src self; frame-ancestors none)
- X-Frame-Options: DENY (clickjacking)
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera/microphone/geolocation disabled
- Strict-Transport-Security (production only)

## Auth & sessions
- Session cookie `equityos_session` (SameSite=Lax)
- Settings + Admin require session
- Force logout clears user sessions (admin)
- Password policy: min 8 chars (signup)

## Rate limiting
- `/api/ai/*` — platform in-memory limiter
- `/api/billing/webhooks/*` — placeholder limiter bucket

## Secrets
- Payment secrets server-only (`/api/billing/*`)
- Never expose Razorpay/Stripe secret keys to the client

## CSRF / XSS
- SameSite cookies reduce CSRF risk for cookie session
- Platform `escapeHtml` helpers for AI prompt surfaces
- CSP reduces XSS blast radius (Next may still need `'unsafe-inline'` for styles)

## Audit
Sensitive actions write to ops audit log (login/logout, plan changes, flags, backups, maintenance).

## Device validation
Device registry from Sprint 12A; admin can force logout to invalidate sessions.
