# Operations Guide — EquityOS

Day-2 operations for Sprint 12C.

## Monitoring
- Admin → Monitoring: latency, error rate, request volume, jobs
- Admin → Logs: structured `equityos-ops` entries
- Background refresh updates synthetic metrics (demo) and re-reads health

## Incident response
1. Check System Health overall status
2. Inspect Logs for `error` / `warn`
3. Review Audit for recent admin/auth/billing actions
4. If payment issues: Admin → Billing + webhook trail
5. Emergency: Feature Flags → Emergency disable

## Maintenance windows
1. Admin → Maintenance → enable + message + ETA
2. Keep **Allow admin login** on for operators
3. Optionally whitelist user IDs
4. Disable when complete (audit entry recorded)

## Notifications
- Push system/security/billing notices from Notifications page
- Email templates queue to local outbox (no live SMTP in demo)

## Backups
- Manual or scheduled backup captures SaaS + ops JSON size estimate
- Retention policy prunes by `retentionDays`
- Restore is a **placeholder** (non-destructive demo)

## Feature flags
Scopes: global, user, plan, beta, canary with `%` rollout hashing.
