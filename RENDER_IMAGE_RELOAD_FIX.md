# DeedForge Render image + reload-state patch

Baseline: current `main` after the CI structural-test patch.

## What this patch fixes

1. Bundled fictional demo images now receive a stable deployment-version query
   (`dfv=20260821-3`) so browsers/Render do not reuse the previously broken
   response under the unchanged `/demo/*.png` URLs.
2. Render is instructed not to retain `/demo/*` assets in cache.
3. Demo campaign objects are normalized on load, including copies persisted in
   localStorage from an older demo session.
4. Design and presentation renderers normalize bundled demo references,
   including older published demo review snapshots.
5. A pre-React image observer is a final compatibility layer for direct demo
   `<img>` usages such as the review-package hero.
6. Campaign workspace + selected tab are kept in sessionStorage and restored on
   reload. The state is cleared when leaving the workspace, exiting demo, or
   signing out.
7. The Campaign Library no longer replaces a failed Phoenix image with the
   unrelated Dallas multifamily fixture.

## Important

- `X-Content-Type-Options: nosniff` remains enabled.
- Real property uploads, signed Supabase URLs, blob URLs, and external images
  are never rewritten.
- This patch does not require Chromium snapshot regeneration.

After deploying, perform one hard refresh if the browser tab was already open
before this patch. Subsequent navigation/reloads should not require it.
