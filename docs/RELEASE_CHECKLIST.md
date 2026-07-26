# Release Checklist — EquityOS (Sprint 12C)

## Pre-release
- [ ] `npm test` green (saas, billing, ops)
- [ ] `npm run lint` clean on changed paths
- [ ] `npm run build` succeeds
- [ ] Security headers verified on `/admin` and `/settings`
- [ ] Demo login works; Admin console reachable for owner
- [ ] Billing sandbox checkout still works (12B)
- [ ] Feature flag emergency disable verified
- [ ] Maintenance mode banner appears when enabled
- [ ] Backup create succeeds; restore placeholder returns message
- [ ] Audit CSV export downloads
- [ ] Webhook rate-limit path does not 500

## Deploy
- [ ] Set `NODE_ENV=production`
- [ ] Configure gateway secrets if going live
- [ ] Record deployment version in ops (`deploymentService.recordDeploy`)
- [ ] Smoke: `/`, `/login`, `/settings/subscription/billing`, `/admin`

## Post-deploy
- [ ] System Health overall = healthy or expected degraded
- [ ] No unexpected error logs
- [ ] Notification test ping
- [ ] Confirm CSP does not break critical pages

## Out of scope (do not block)
Broker APIs, live trading, mobile/desktop natives
