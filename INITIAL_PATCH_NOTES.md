# DeedForge initial stability patch

Baseline inspected: `main` commit `5fd951dda2f3d25a144e9ee22ad72e481be3abbe` (2026-08-21).

This ZIP is intentionally an overlay patch, not a full repository export. Extract it at repository root so the included paths replace the matching files.

## Included changes

1. Fixes `extract-property-data` to match the current `_shared/usage.ts` and `_shared/http.ts` contracts.
2. Allows organization-authorized property extraction before a campaign UUID exists; draft placeholders are normalized to a null campaign ID for server accounting.
3. Makes `claimGeneration` accept a nullable campaign ID for legitimate pre-campaign/provider-test operations.
4. Repairs Fresh Demo Generation as an authenticated, real NVIDIA provider-test path without treating `demo-org` or `demo-campaign-preview` as real tenant rows.
5. Provider tests resolve a real organization membership, use server rate/request controls, and store temporary private assets under `campaign-assets/<org>/provider-tests/<user>/...`.
6. Adds Deno/Edge Function typechecking to GitHub CI so browser-only typechecking cannot miss Edge Function contract drift.
7. Registers `extract-property-data` in `supabase/config.toml`.
8. Keeps exact PNG/PDF export assertions but gives high-resolution rasterization enough CI time and waits for the intended canvas before export.
9. Updates Render build hygiene to `npm ci` without renaming the existing Render service in this stability patch.

## Deliberately not auto-fixed

The current `design-visual.spec.ts` failures are repeatable screenshot-baseline differences (including a 1px scaled-preview size change and ~20-25% pixel differences), not random flakes. Do not raise `maxDiffPixelRatio` just to make CI green. Open the Playwright failure artifacts, compare the approved current DeedForge visuals, and only then regenerate the affected baselines with:

`npx playwright test e2e/design-visual.spec.ts --project=chromium-desktop --update-snapshots`

Review the changed PNGs before committing them.

## Follow-up work after this patch

- Add lifecycle cleanup for `campaign-assets/<org>/provider-tests/...` temporary provider-test assets.
- Replace the literal new-campaign `campaignId="drafts"` UI workaround with an explicit draft session/storage identifier.
- Move draft property photos into the final campaign path after campaign creation.
- Make server-side `ai_provider_settings` the authoritative paid-generation permission in the Settings UI.
- Normalize persisted campaign source data so signed URLs are not written back into JSON.
- Consolidate schema setup around migrations as the single source of truth.
- Update `DEPLOYMENT.md` to deploy `extract-property-data` and finish remaining ZAW -> DeedForge naming cleanup.
