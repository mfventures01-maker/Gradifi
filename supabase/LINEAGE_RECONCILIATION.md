# Supabase production migration lineage reconciliation

Project: Sentiment and Emotional Free Assessment System
Project ref: `ehkmfnaqkdgkjmdxxbwj`

This branch restores the repository's migration history to the versions recorded in the live Supabase `supabase_migrations.schema_migrations` table. It is a source-control reconciliation only. It does not apply SQL to the live database.

## Evidence

- Live migration history contains 33 versions.
- The original 8 migration files on the verification baseline were checked against the live stored statements and matched after SQL comment/whitespace normalization.
- The 16 later CBT / production-lineage migration files were checked against the live stored statements and matched after SQL comment/whitespace normalization.
- Seven canonical actor migration files matched the live stored statements after SQL comment/whitespace normalization.
- The first canonical actor onboarding migration differed: the repository branch omitted the live dean actor-role allowlist members `vice_principal`, `bursar`, and `teacher`. This file is reconstructed from the exact statement stored for live version `20261107144418`.
- The P0.1 canonical candidate ownership migration was absent from the inspected repository branches. Its file is reconstructed from the exact statement stored for live version `20261107195950`.
- The eight canonical actor migration files use the exact live migration version prefixes, not the earlier local filename timestamps. This prevents accidental duplicate execution under mismatched versions.

## Safety boundary

- Do not run `supabase db push`, `supabase migration up`, reset, or repair commands against production as part of this reconciliation.
- The files represent already-applied production history. They are being restored to source control so future diffs can be evaluated against the real baseline.
- The live project has not been modified by this branch.
- Any new schema change must be introduced as a new migration after this baseline is merged and reviewed.

## Reconciled migration inventory

The `supabase/migrations` directory contains the 33 live versions: the original 8, 16 production-lineage recovery migrations, 8 canonical actor migrations, and P0.1 canonical candidate ownership.
