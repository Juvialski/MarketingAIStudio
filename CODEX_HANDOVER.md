# DeedForge architecture handover

Verified against the `main` branch and implementation state on 2026-08-22.

DeedForge is a React 18 + TypeScript + Vite application with Supabase Auth,
Postgres, private Storage, and authenticated Edge Functions. The browser owns
presentation state; Supabase owns live campaign, asset, AI-usage, and review
publication state.

## Architecture map

```text
App / route state
  -> campaign workspaces and feature components
  -> application-facing services
  -> Supabase client, Edge Functions, Storage, local demo stores
```

Important current boundaries:

- `src/App.tsx` owns route selection, authenticated organization bootstrap,
  campaign list/selection, Brand Kit state, and the explicit `demo`/`live`
  runtime boundary.
- `src/services/supabase/campaignService.ts` maps campaign rows and content
  rows, sanitizes persistent asset URLs, registers asset metadata, and
  hydrates fresh signed URLs before returning a live campaign.
- `src/services/supabase/storageService.ts` owns tenant-scoped paths, upload
  validation, Storage access, and post-save `campaign_assets` registration.
- `src/services/supabase/assetResolver.ts` treats bucket/path/asset ID as
  durable identity. Signed URLs and demo object references are runtime-only.
- `src/services/providers/` contains the text/image provider contracts,
  registries, secure Supabase Edge adapter, usage tracking, and cost controls.
- `src/services/review/reviewSnapshotBuilder.ts` creates immutable review
  snapshots. `CampaignReviewService` selects the live RPC/Edge path or the
  explicitly scoped local demo store.
- `supabase/functions/` authenticates live operations, validates request and
  structured AI output, and keeps provider secrets server-side.
- `src/components/campaigns/` remains feature-heavy, but route-level feature
  loading keeps intake, workspace, review, settings, and presentation code
  out of the initial bundle.

## Runtime modes

- `demo`: intentional fictional fixtures, local campaign/review stores, and
  deterministic/mock generation. Demo content is labeled and uses `Demo`,
  `Fictional`, `fixture`, or equivalent provenance.
- `live`: authenticated organization data and secure backend generation. Live
  load/save/provider failures remain errors; they do not turn into sample
  campaigns or fixture image results.
- A no-backend local install is presented as the labeled demo workspace. A
  `?demo=1` query explicitly selects demo mode even when Supabase is configured.
- The standalone presenter route permits only the two known bundled demo
  campaign IDs as a demo fixture route; arbitrary live presenter IDs cannot
  resolve local samples.

## Campaign persistence

Campaign JSON is stored in `campaigns`; copy and presentation payloads are
stored in `campaign_content` and hydrated into the domain `Campaign` type.
Application callers pass `runtimeMode` to the live service methods. Content
lookups are batched and writes are parallelized; obsolete copy/presentation
content is removed when the complete campaign snapshot no longer contains it.

The service still performs the campaign row and content writes as separate
client requests. A future transaction/RPC should make that multi-row write
fully atomic and add optimistic version checking for cross-device concurrent
edits. This is the main remaining campaign-state risk.

## Asset lifecycle

```text
upload/generation
  -> validate type, size, and binary signature
  -> persist private Storage object
  -> save canonical bucket/path in campaign source data
  -> register campaign_assets after a real campaign UUID exists
  -> resolve a fresh signed URL for rendering
```

Supported property upload types are JPEG, PNG, and WebP up to 25 MB. New live
campaign intake may temporarily use an `org/drafts/...` Storage path; metadata
registration is deferred until the server creates the campaign UUID, so the
invalid `drafts` value is never inserted into `campaign_assets`.

`campaign_assets` metadata includes the expanded source/provenance vocabulary
from the production hardening migration. Generated images are persisted by
`generate-image` before the UI attaches the canonical reference to campaign
source data. A failed save is visible to the user, but abandoned draft objects
still need a future cleanup/reconciliation job.

Private buckets and organization-prefixed Storage policies are established by
the forward migration chain beginning with
`20260820110000_production_hardening.sql`.

## AI provider boundary

- Live text and image generation use Supabase Edge Functions only.
- Demo text uses deterministic mock generation; demo image fixtures are
  available only from demo mode.
- Live image generation returns a persisted private Storage asset, never a
  provider URL.
- Image attempts have a stable UI idempotency key; the server usage claim has
  an organization/key uniqueness boundary.
- `ImageGenerationModal` exposes preparing/submitting/generating/persisting/
  attaching/completed and failure categories. A persistence error is not
  presented as a generic provider success/failure ambiguity.
- `extract-property-data`, strategy, copy, presentation, and critique routes
  use runtime schemas. Paste Everything now validates the extracted payload at
  the Edge boundary before returning it to the browser.
- Quota numbers shown by registries are estimates/observations. Backend health
  reports configured capability, and provider diagnostics are authenticated,
  owner/admin scoped, and usage-metered.

## Paste Everything and financial truth

`PropertyExtractionService` retains a conservative deterministic parser for
currency shorthand, addresses, rent, cap rates, bullets, and evidence snippets.
Explicit demo calls do not contact the live Edge Function. Manual values remain
authoritative in the intake merge flow; conflicting extracted values are
flagged for review.

`financialTruthEngine.ts` remains the arithmetic source of truth. The new
`financialValidation.ts` reports deterministic errors for invalid inputs and
warnings for suspicious combinations such as purchase price or all-in basis
above ARV, renovation budget above ARV, and projected rent below current rent.

## Public review

Owner publication builds an immutable snapshot version. Live review links use
256-bit opaque tokens hashed with SHA-256 server-side. Public access is
anonymous through `get-public-review` with JWT verification disabled only for
that function.

The Edge Function now resolves the token to its campaign, verifies referenced
asset metadata against that campaign/organization, signs only authorized
objects, and removes internal Storage references from the anonymous response.
Review feedback remains version-bound and material/variant validated. A
forward-only migration also makes approval notes obey `allow_comments`.

The direct RPC compatibility fallback remains for deployments where the Edge
Function is not deployed, but transient deployed-function failures no longer
fall through to it.

## Performance

Measured production builds with CI-like environment values:

| Metric | Before | After |
| --- | ---: | ---: |
| Initial JS chunk | 1,698.34 kB | 1,037.22 kB |
| Initial JS gzip | 477.27 kB | 319.36 kB |

Presentation, public review, campaign intake, settings, Brand Kit, lead
finder, and campaign workspace/export dependencies are lazy-loaded. Export
libraries remain deferred with the workspace/export chunks.

## Verification commands

Verified locally in this run:

- `npm run typecheck` — pass.
- `npm test` — 44 test files, 229 tests pass.
- `npm run test:security` — 14 tests pass, including full migration replay.
- `npm run test:e2e` — 35 tests pass across desktop/mobile demo, review,
  presentation, design, export, Brand Kit, and lightbox contracts.
- Focused Playwright also passes: presentation 6/6, design 2/2, export 2/2,
  lightbox 4/4.
- `npm run build` — pass with the bundle measurements above.

The local machine does not have the Deno CLI installed, so the CI-equivalent
`deno check` loop was not runnable locally. The repository CI workflow remains
the source of truth for Edge Function type checking.

## Migrations

`supabase/migrations/20260822090000_review_approval_comment_permission.sql`
is forward-only and replaces the public approval RPC body so non-empty approval
notes are rejected when comments are disabled. It does not edit an earlier
applied migration or change the existing token/function signature.

## Remaining risks

- Campaign row plus `campaign_content` writes are still not one database
  transaction; deploy a tested atomic save RPC before relying on concurrent
  multi-device editing.
- Pending AI usage claims can remain reserved if the Edge runtime dies before
  `finish_ai_generation`; add a stale-claim lease/reconciliation policy.
- Draft uploads abandoned before campaign creation can leave orphaned Storage
  objects; add a cleanup job keyed by the `drafts` prefix and age.
- Review-link mutation currently follows the existing organization-member
  authorization model; tighten it to owner/admin if product policy requires
  that restriction.
- The new migration and Edge changes must be deployed to the configured remote
  Supabase project before live users rely on them.
