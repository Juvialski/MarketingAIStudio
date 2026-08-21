# ZawMarketing Production Hardening Audit

Audit date: 2026-08-20  
Starting Git HEAD: `04651257e952fc452eb367c4430703ca1ce35cbd`  
Audit branch: `codex/hardening-production-readiness`

## Executive assessment

The handoff build compiles and its 48 unit tests pass, but it is not production-ready. The tests primarily assert static registries, deterministic helpers, and mock behavior. They do not exercise authenticated persistence, tenant isolation, Storage authorization, Edge Function authorization, real provider contracts, exact export pixels, browser workflows, or rendered screenshots.

The release blockers are confirmed rather than hypothetical:

1. Private Gemini and NVIDIA credentials are present in the ignored local `.env` under `VITE_` names and were consumed by browser code. The generated `dist` containing those values was removed immediately. No secret-shaped token was found in reachable Git history by a filename-only scan; the local provider credentials still require rotation/revocation because they have been exposed to browser JavaScript.
2. All Storage buckets are public and every authenticated account can write, overwrite, and delete every organization's objects.
3. Database policies accept duplicated `organization_id` values without proving they match parent rows. Organization role management permits admin self-promotion/owner mutation and last-owner removal.
4. Edge Functions authenticate a user but do not authorize organization/campaign access, validate model/provider allowlists, validate response schemas, or enforce paid-generation budgets.
5. Authenticated campaign creation generates a non-UUID client ID and then incorrectly executes `UPDATE`; failures are ignored. Database errors and empty workspaces silently become fictional sample data.
6. Provider catalogs and adapters make materially false claims. Several configured model IDs/endpoints are retired, invented aliases, or mapped to a different model than the UI reports.
7. PNG and PDF exporters scale the responsive preview rather than render at declared output dimensions. The PDF is rasterized despite UI claims of vector typography.

## Evidence and required remediation

### P0 — Client secret exposure

Affected files:

- `.env` (ignored local file; secret values not recorded here)
- `.env.example`
- `src/services/storage/settingsStore.ts`
- `src/components/settings/SettingsView.tsx`
- `src/services/providers/aiProvider.ts`
- `src/services/providers/supabaseFunctionsProvider.ts`
- `src/services/providers/geminiProvider.ts`
- client image-provider adapters and benchmarking UI

Evidence:

- `SettingsStore` reads `VITE_GEMINI_API_KEY`, `VITE_NVIDIA_API_KEY`, `VITE_BFL_API_KEY`, and `VITE_OPENAI_API_KEY`, then serializes the entire key-bearing configuration to localStorage.
- Settings renders private-key inputs and tests Gemini by placing the key in a browser URL.
- `ProviderManager` selects direct browser Gemini/image adapters. Edge failures silently call those direct adapters.
- The local `.env` has populated browser-prefixed Gemini and NVIDIA values. A baseline Vite build therefore embedded them in client assets.

Required fix: remove private-key fields from all client types/UI/storage, make live generation Edge-only, add an authenticated server status/health operation, and permit only an explicitly labeled deterministic demo fixture when the backend is unavailable. Rotate the locally exposed provider credentials.

Existing tests: none detect bundling, localStorage persistence, browser network calls, or Edge-to-client secret fallback.  
Regression risk: high; generation UX must distinguish live, demo, and backend-failure states.

### P0 — Storage tenant isolation

Affected files:

- `supabase/migrations/20260820100001_storage_setup.sql`
- `src/services/supabase/storageService.ts`
- asset/export database columns and generated types

Evidence:

- Four buckets are created with `public = true`.
- SELECT permits public reads; INSERT/UPDATE/DELETE only check `auth.role() = 'authenticated'`, not the first path segment or organization membership.
- Client code calls `getPublicUrl` and persists public URLs as asset identity.
- Upload errors silently return an object URL, making a live upload failure look successful.

Required fix: a forward migration must make buckets private, replace policies with organization-prefix membership checks, store bucket plus canonical path, produce signed/authenticated URLs on demand, and reject live upload failures. Add A/B organization integration tests for select/upload/update/delete/signed access.

Existing tests: `supabaseDataMapping.test.ts` checks only a path string.  
Regression risk: high; legacy public URLs need a safe transition plan and remote object inventory.

### P0 — Database tenancy and role integrity

Affected file: `supabase/migrations/20260820100000_initial_schema.sql`

Evidence:

- `campaign_content`, `campaign_assets`, `design_exports`, `leads`, and `ai_generation_logs` independently accept `organization_id` plus a parent ID; no composite FK or trigger proves the organizations match.
- `campaigns.brand_kit_id` does not prove the brand kit belongs to the campaign organization.
- broad `FOR ALL` policies omit explicit `WITH CHECK` and permit unsafe role transitions.
- an admin can manage owner rows, promote themselves, remove owners, or remove the last owner.
- public `SECURITY DEFINER` helpers accept arbitrary user IDs and have no explicit execute revocations.
- AI log INSERT accepts unrelated/null organizations and campaigns when `user_id` is the caller or null.

Required fix: forward-only composite uniqueness/FKs or validation triggers, caller-bound helper signatures using `auth.uid()`, locked execute privileges, explicit UPDATE checks, and owner-preserving role functions/policies. AI logs should be written only by authenticated server code with validated organization/campaign context.

Existing tests: no SQL/RLS tests.  
Regression risk: medium-high; migration must inspect existing inconsistent rows before adding constraints.

### P0 — Edge Function trust boundaries and spend controls

Affected files: all files under `supabase/functions/`.

Evidence:

- strategy/copy/image verify a JWT but trust browser-supplied organization, campaign, model, provider, and source objects.
- `critique-copy` has no application-level authentication or membership check.
- there is no request schema, size bound, field-length bound, model allowlist, provider allowlist, idempotency key, duplicate suppression, or atomic rate/budget ledger.
- BFL paid generation defaults on direct function invocation and is independent of the local “paid off” toggle.
- provider error bodies can be returned/logged without sanitization.

Required fix: shared authenticated request wrapper, membership/campaign authorization, Zod-compatible server schemas, server allowlists, sanitized errors, and atomic per-user/org/campaign quotas. Paid generation remains off by default in server-owned workspace policy.

Existing tests: none invoke Edge Functions.  
Regression risk: high; server and client request/response schemas must be versioned together.

### P0 — Campaign persistence and silent demo fallbacks

Affected files:

- `src/App.tsx`
- `src/services/supabase/campaignService.ts`
- `src/services/supabase/authService.ts`
- `src/services/supabase/organizationService.ts`
- `src/services/supabase/brandKitService.ts`
- `src/services/supabase/leadService.ts`
- local stores

Evidence:

- creation uses `camp-${Date.now()}`; `saveCampaign` treats every ID except `camp-sample-*` as an existing row and runs UPDATE against a UUID column.
- Supabase errors and affected-row counts are ignored; local cache updates happen before server success.
- zero authenticated rows and database/network errors both return demo campaigns/leads/brand data.
- `AuthService.getUser()` substitutes a fictional authenticated user when Supabase returns no user; organization/profile failures substitute Apex identities.
- live operations use a hard-coded demo organization when organization state is unavailable.
- content upsert has no conflict target that establishes one accepted package per campaign/version.

Required fix: explicit runtime mode and entity provenance, server-generated UUID on INSERT, typed error results, no samples in authenticated empty/error states, and rollback/preserve prior state on failed persistence.

Existing tests: mapping only; no CRUD/reload flow.  
Regression risk: high; the app state layer needs deliberate live/demo separation.

### P0 — Fake identity provisioning

Affected files:

- signup trigger in `20260820100000_initial_schema.sql`
- `AuthModal.tsx`, `authService.ts`, `organizationService.ts`, `brandKitService.ts`
- normal campaign intake defaults

Evidence: new accounts/default profiles/brand kits can receive Apex names, fake website/phone/license, and prefilled fictional deal details without an explicit Demo label.

Required fix: neutral workspace/company defaults and blank optional business/legal fields. Fictional data belongs only to a clearly labeled demo fixture.

### P1 — Provider accuracy

Official documentation reviewed on 2026-08-20:

- [Google API-key security](https://ai.google.dev/gemini-api/docs/api-key)
- [Google image generation models](https://ai.google.dev/gemini-api/docs/image-generation)
- [Google structured output](https://ai.google.dev/gemini-api/docs/structured-output)
- [Google rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [BFL getting started](https://docs.bfl.ai/quick_start/get_started)
- [BFL image generation and polling](https://docs.bfl.ai/quick_start/generating_images)
- [BFL pricing](https://docs.bfl.ai/quick_start/pricing)
- [NVIDIA visual NIM OpenAI-compatible API](https://docs.nvidia.com/nim/visual-genai/latest/api/openai-image-generation.html)
- [NVIDIA SDXL Turbo deprecation](https://build.nvidia.com/stabilityai/sdxl-turbo)
- [OpenAI image generation](https://developers.openai.com/api/docs/guides/image-generation)

Confirmed mismatches:

- NVIDIA defaults to deprecated SDXL Turbo and stale model identifiers.
- BFL uses `api.bfl.ml`, maps FLUX.2 labels to FLUX.1 endpoints, ignores returned `polling_url`, uses obsolete reference fields, returns an expiring signed URL, and hard-codes stale per-image prices.
- Gemini “Nano Banana” aliases always call retired `imagen-3.0-generate-002`; a text-only/no-image response becomes an Unsplash fallback recorded as paid success.
- OpenAI `gpt-image-2` is silently mapped to DALL-E 3 and the adapter expects a URL instead of current base64 output.
- AI JSON is parsed and type-cast without response JSON Schema or runtime Zod validation.
- local observed Gemini quota numbers are represented as stable product facts, and any `RESOURCE_EXHAUSTED` 429 is misclassified as daily quota.

Required fix: no unverified live claim. Keep stale providers disabled, implement exact official server contracts, persist generated binaries to private Storage, and return typed `generated | uploaded | fixture | fallback | failed` provenance. Project-specific quota observations must be labeled estimates.

### P1 — Export and visual reliability

Affected files:

- `src/services/export/graphicExporter.ts`
- `src/services/export/pdfExporter.ts`
- `src/services/export/marketingKitZip.ts`
- `src/components/designs/DesignRenderer.tsx`
- `src/components/designs/DesignEditor.tsx`
- remote Unsplash fixtures

Evidence:

- responsive canvases are at most about 560 CSS px wide; `pixelRatio: 2`/`2.5` does not guarantee declared dimensions.
- no exported bitmap dimension assertion exists.
- PDF embeds a DOM raster into a correctly sized page but calls the result vector/300-DPI typography.
- ZIP filenames say `1080px` even where output is not 1080 px and export errors are swallowed, allowing incomplete kits.
- remote images can taint/fail canvas and are nondeterministic for visual tests.
- current stress tests assert constants/formatters, not rendered content, overlap, clipping, contrast, or screenshots.

Required fix: render cloned canvases at exact target width/height, await fonts/images, verify PNG headers/dimensions, generate true high-resolution raster PDFs with truthful copy, bundle local/CORS-safe fixtures, and fail the ZIP with a useful manifest when a required asset is missing.

### P1 — Dependency, CI, E2E, accessibility, and release quality

Evidence:

- baseline: 8 Vitest files, 48/48 tests passing; TypeScript + production build passing.
- `npm audit` reports a critical vulnerable `jspdf` chain and a moderate `dompurify` chain; fixed release is `jspdf` 4.2.1.
- no GitHub Actions workflow, Playwright configuration, E2E suite, actual RLS/Storage tests, Edge tests, visual regression, or automated accessibility checks.
- baseline Vite bundle is about 1.56 MB minified before code splitting.
- dialogs do not consistently expose dialog semantics, focus trapping/restoration, Escape handling, or accessible close names.

Required fix: update the vulnerable PDF dependency with regression testing, add CI, mocked browser E2E, local/ephemeral Supabase integration tests, screenshot tests with deterministic assets/fonts, and focused accessibility remediation.

## Remote Supabase verification status

Remote verification is blocked by authentication, not assumed complete:

- repository config targets `csolgywkgummefnwouny` and local config declares PostgreSQL 15;
- Supabase CLI 2.115.0 is available via `npx` but has no access token/profile;
- the installed Supabase connector returns “You do not have permission” for project, migrations, tables, Edge Functions, and advisors;
- the in-app browser reaches the Supabase/GitHub sign-in screens but has no authenticated session.

Therefore migration history, remote schema, RLS, buckets, policies, Auth configuration, secrets, deployed function versions, PostgreSQL version, generated types, security advisors, and performance advisors are **not verified**. No remote migration, reset, function deployment, or secret change has been attempted.

## Implementation order approved by lead audit

1. Remove client secret fields/calls/fallbacks and introduce explicit demo/live provider states.
2. Add forward-only Storage/RLS/tenancy/role/log/rate-policy migrations, with local static and SQL tests.
3. Harden shared Edge authorization, schemas, allowlists, provenance, and server spending controls.
4. Correct live/demo data flow and server-generated UUID persistence with typed service errors.
5. Align only verified provider contracts; disable the rest truthfully.
6. Make exports exact and deterministic; update PDF dependency and claims.
7. Add CI, E2E, integration, visual, and accessibility coverage.
8. Re-run independent security/AI/QA/design/data review, then update README and handover only with verified claims.

