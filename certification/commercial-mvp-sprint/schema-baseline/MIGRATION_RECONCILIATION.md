# Gradifi Verify production migration reconciliation

**Generated:** 2026-11-14  
**Production project:** `ehkmfnaqkdgkjmdxxbwj`  
**Production applied migration versions:** 33

## Version-set comparison

| Source | SQL files | Missing versions | Extra versions |
|---|---:|---:|---:|
| Production ledger | 33 | 0 | 0 |
| `main` | 1 | 32 | 0 |
| `sprint/verify-commercial-mvp-10h` | 8 | 25 | 0 |
| `chore/supabase-production-lineage-reconciliation` | 33 | 0 | 0 |

## Findings

- Production ledger: 33 applied versions.
- `main`: 1 migration file; 32 production versions absent.
- Verify sprint branch: 8 migration files; 25 production versions absent.
- Canonical lineage recovery branch: 33 migration files; version set matches production with no missing or extra versions.
- The canonical lineage branch is PR #9. It is not merged. Its previously observed comparison against `main` was diverged by 244 commits ahead and 1 behind. Do not merge it wholesale into the Verify sprint.
- This report validates migration version filenames against the production ledger. It does not claim a fresh byte-for-byte SQL-body comparison in this export pass.

## Production version list

- `20260819`
- `2026082101`
- `2026082102`
- `2026082103`
- `2026082104`
- `2026082105`
- `2026082106`
- `2026091200`
- `20261004073941`
- `20261102072830`
- `20261102072842`
- `20261102072907`
- `20261102073009`
- `20261102083959`
- `20261105103635`
- `20261105103718`
- `20261105115914`
- `20261105120550`
- `20261105121052`
- `20261105121114`
- `20261105121142`
- `20261105220809`
- `20261105221315`
- `20261106012632`
- `20261107144418`
- `20261107144420`
- `20261107144421`
- `20261107144805`
- `20261107153522`
- `20261107153751`
- `20261107153841`
- `20261107153958`
- `20261107195950`

## Safety

This is a read-only reconciliation. No migration was applied, repaired, replayed, or reset. No production schema was changed.
