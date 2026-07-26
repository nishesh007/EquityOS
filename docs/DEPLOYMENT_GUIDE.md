# Deployment Guide — EquityOS

Sprint 12C production deployment outline (Next.js App Router).

## Prerequisites
- Node 20+
- `npm ci`
- Env vars for AI (optional) and billing gateways (optional — sandbox without keys)

## Build & run
```bash
npm run lint
npm test
npm run build
npm start
```

Dev:
```bash
npm run dev
```

## Environment
| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | prod | Enables HSTS header |
| `RAZORPAY_*` / `STRIPE_*` | no | Live billing; sandbox otherwise |
| `OPENAI_API_KEY` | no | AI features |
| `AI_RATE_LIMIT_PER_MINUTE` | no | Default from platform env |

## Versions
- Build version sourced from package (`0.1.0`) via ops deployment metadata
- Visible on System Health dashboard (`buildVersion`, `deploymentVersion`, `lastDeploymentAt`)

## Security headers
Middleware applies CSP, `X-Frame-Options: DENY`, nosniff, referrer policy, permissions policy, and HSTS in production.

## Protected routes
Cookie `equityos_session` required for `/settings/*` and `/admin/*`.

## Health check
Use Admin → System Health or `healthService.snapshot()` for component status.
