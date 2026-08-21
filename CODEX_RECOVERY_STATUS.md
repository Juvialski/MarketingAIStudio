# Codex Recovery & Hardening Status

**Document Date:** August 20, 2026  
**Local Branch:** `codex/hardening-production-readiness`  
**Local HEAD:** `53de06f` (`docs: add verified production hardening audit`)  
**Remote `origin/main` HEAD:** `0465125` (`feat(ai): dual-tier AI architecture with Gemini quotas, BFL FLUX.2 image engine, spending controls, and quality benchmark`)

---

## 1. Summary of Recovered Codex Work

Codex performed a comprehensive production hardening pass and audit (`CODEX_AUDIT.md`), making significant architectural security and data-integrity improvements:

1. **Client Secret Removal & Edge Delegation**:
   - Removed all `VITE_*` API keys and client-side secret inputs from `SettingsView.tsx` and `settingsStore.ts`.
   - Deleted browser-direct AI provider adapters (`geminiProvider.ts`, `bflImageProvider.ts`, `geminiImageProvider.ts`, `nvidiaImageProvider.ts`, `openaiImageProvider.ts`).
   - Routed all generation through secure Supabase Edge Functions (`supabase/functions/`) via `supabaseFunctionsProvider.ts` with strict Zod schema validation.

2. **Database Tenancy & Least-Privilege RLS**:
   - Authored `supabase/migrations/20260820110000_production_hardening.sql` with parent-tenant integrity triggers, immutable organization IDs, caller-bound `auth.uid()` security definer functions, and server-managed spending ledgers (`ai_provider_settings`, `ai_generation_usage`).
   - Created `src/services/supabase/serviceError.ts` to provide structured error handling instead of silent demo fallbacks on database failures.

3. **Baseline Test Expansion**:
   - Maintained 10 Vitest test suites (55 passing tests).
   - Added Playwright configuration (`playwright.config.ts`, `e2e/`) and export dimension verification scripts.

---

## 2. Incomplete & Partially Complete Codex Work

While security and database scaffolding were established, the output generation and visual export pipeline remained critically broken:

1. **Export Scaling & Layout Clipping (P0 Visual Failure)**:
   - Graphic export previously took a responsive ~500px preview element and stretched/captured it via `html-to-image`, leading to severely clipped badges ("OPPORTUN...", "COMMERCI..."), overlapping titles, cut-off metric values, and canvas overflow.
   - Safe zones for Stories (top/bottom UI overlays) and social formats were not enforced.
   - Text auto-fitting was not implemented, causing text to clip or truncate when content length varied.

2. **Financial Arithmetic & Fact Ledger Inconsistencies**:
   - Phoenix demo copy claimed 17.9% "gross margin on cost" on a $70k spread ($70k / $320k = 21.875% on cost; 17.9% was spread / ARV).
   - Dallas demo copy conflated 9.4% stabilized cap rate on purchase price with yield on total project cost (~8.7%), and presented inconsistent rent gap assumptions ($350/mo vs $250/mo).
   - Unsupported cash-on-cash return (12.8%) was shown without complete financing debt service assumptions.

3. **Media & Campaign Asset Correctness**:
   - Dallas 8-unit multi-family demo fixture was using single-family home exterior/interior photos.
   - Phoenix flyer duplicated the same interior photo in multiple slots.
   - Demo graphics lacked clear "FICTIONAL DEMO" labels and used "Apex Capital & Acquisitions" branding with duplicate footer text ("Acquisitions Acquisitions").

4. **PDF Flyer Bugs**:
   - Raw database enum formatting (`single_family`) exposed in UI.
   - Metric card text truncated ("3 Bed / 2 B...").
   - Lack of adaptive layout based on available image count.

---

## 3. Conflicts Found

- **No Git merge conflicts**: Working tree is clean on top of `codex/hardening-production-readiness`.
- **Architectural Conflict**: Previous responsive DOM export approach vs. deterministic fixed target-space coordinate rendering. Resolved in favor of fixed-coordinate rendering with CSS zoom preview.

---

## 4. Antigravity Action Plan (This Run)

1. **Phase 1 — Financial Truth Layer**:
   - Implement `financialTruthEngine.ts` with canonical calculations (`allInBasis`, `grossSpread`, `grossSpreadOnCost`, `pricePerSqFt`, `pricePerDoor`, `rentUpside`, `inPlaceCap`, `stabilizedCap`, `yieldOnCost`).
   - Implement fact ledger, claim gating, and cross-platform copy consistency validator.

2. **Phase 2 — Deterministic Fixed-Coordinate Export Engine & Layout Preflight**:
   - Redesign templates to render in deterministic target dimensions (1080x1080, 1080x1350, 1080x1920, 1200x630, 2550x3300) with zoom scaling for previews.
   - Implement text auto-fitting utilities (`fitHeadline`, `fitBadgeText`, `fitMetricValue`, `fitContactLine`).
   - Implement `validateDesignLayout` preflight check to reject clipped/overflowing layouts.
   - Format-specific safe zones (especially Story top/bottom margins).

3. **Phase 3 — Media Correctness & Design Family Polish**:
   - Bundle correct multi-family images for Dallas and single-family images for Phoenix.
   - Adaptive image grids (1 hero, 2 = hero+secondary, 3 = hero+secondary stack; no duplicates).
   - Format-aware contact hierarchy and professional real estate creative with restrained branding.

4. **Phase 4 — PDF Flyer & Packaging Hardening**:
   - Fix duplicate footer, raw enums, metric card wrapping, and print disclosures.
   - Add `04-Campaign-Fact-Sheet.md` and clean ZIP bundle naming.

5. **Phase 5 — Verification & Visual QA**:
   - Financial unit tests, bounding-box tests, exact dimension tests.
   - Visual inspection of all 8 social outputs and 2 PDF flyers.
