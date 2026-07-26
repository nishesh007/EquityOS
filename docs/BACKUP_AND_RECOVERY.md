# Backup and Recovery — EquityOS

Sprint 12C backup model (local-first demo).

## What is backed up
Logical snapshot size of:
- SaaS state (`equityos.saas.platform.v1`)
- Ops state (`equityos.ops.platform.v1`)

## Operations
| Action | Where |
|---|---|
| Manual backup | Admin → Backups |
| Scheduled backup | “Run scheduled backup” |
| History | Backup cards with status/size/retention |
| Restore | Placeholder message only (no destructive overwrite) |

## Retention
Each backup has `retentionDays` (default 30). `applyRetention` drops older records.

## Production recommendations
1. Persist to object storage (S3/GCS) instead of browser localStorage
2. Encrypt backups at rest
3. Test restore quarterly
4. Separate DB dumps (Postgres) from app config snapshots
5. Keep billing webhook audit outside of user-editable storage

## Failure handling
Failed backups record `status: failed` + error string and remain visible in history.
