# Admin Guide — EquityOS Operations Console

Sprint 12C enterprise administration.

## Access
- Route: `/admin`
- Requires authenticated session + **Owner** or **Admin** role
- Demo: `analyst@equityos.demo` / `EquityOS!demo` (owner)

## Sections
| Section | Path | Purpose |
|---|---|---|
| Dashboard | `/admin` | DAU/MAU, health, global search, exports |
| Users | `/admin/users` | Suspend, reactivate, force logout, roles |
| Licenses | `/admin/licenses` | Pool stats + inventory |
| Subscriptions | `/admin/subscriptions` | Renew / cancel / upgrade / downgrade |
| Billing | `/admin/billing` | Payments, refunds, coupons (12B) |
| Feature Flags | `/admin/feature-flags` | Rollouts + emergency disable |
| System Health | `/admin/health` | Component + API health |
| Logs | `/admin/logs` | Structured ops logs |
| Monitoring | `/admin/monitoring` | Latency / error / volume metrics |
| Notifications | `/admin/notifications` | Inbox + email outbox |
| Maintenance | `/admin/maintenance` | Maintenance mode controls |
| Audit | `/admin/audit` | Action timeline + CSV export |
| Settings | `/admin/settings` | Branding / legal / currency |
| Backups | `/admin/backups` | Manual + scheduled backups |

## Global search
Dashboard search covers users, licenses, subscriptions, and audit entries.

## Reporting
Dashboard actions export system health CSV, system report text, and audit CSV.
