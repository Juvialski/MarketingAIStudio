# CODEX HANDOVER DOCUMENTATION
## AI Real Estate Marketing & Business Automation Studio

**Project Name:** `zaw-marketing-studio`  
**Version:** 2.2.0 (Dual-Tier AI Architecture: Gemini Marketing Intelligence & FLUX.2/NVIDIA Visual Engine)  
**Target Audience:** Real Estate Investment Companies, Private Capital Funds, Value-Add Operators, Commercial Syndicators  
**Primary Tech Stack:** React 18, TypeScript (Strict), Vite, Tailwind CSS, Supabase (`@supabase/supabase-js`), Lucide Icons, Vitest, `@google/genai`, Black Forest Labs API (`bfl`), NVIDIA NIM, `html-to-image`, `jspdf`, `jszip`

---

## 1. AI Provider Architecture & Quota Strategy

### 1.1 Observed Project Quotas (Google AI Studio Dashboard)
The system is configured with real observed Gemini project quotas:

| Model ID | User-Facing Display Label | Observed RPM | Observed TPM | Observed RPD | Role / Tier |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `gemini-3.5-flash-lite` | **Recommended · High Volume** | 15 RPM | 250k TPM | **500 RPD** | **Default Model** (Routine Workloads) |
| `gemini-3.1-flash-lite` | **High Volume Fallback** | 15 RPM | 250k TPM | **500 RPD** | **Primary High-Volume Fallback** |
| `gemini-3.5-flash` | **Enhanced Quality · Limited** | 5 RPM | 250k TPM | **20 RPD** | Intermediate Quality Model |
| `gemini-3.6-flash` | **Advanced · Limited** | 5 RPM | 250k TPM | **20 RPD** | Advanced Quantitative Synthesis |
| `gemini-3.7-flash` | **Latest · Highest Quality · Limited** | 5 RPM | 250k TPM | **20 RPD** | **Preferred Premium Model** (Strategy/Review) |

---

### 1.2 Model Selection & Workload Allocation
* **Default High-Volume Model (`gemini-3.5-flash-lite`)**:
  - Handles campaign drafts, platform copy adaptations (LinkedIn, Instagram, Facebook, Email, Video Reel Script), headline variations, CTA options, rewriting, copy cleanup, structured JSON generation, lead summaries, and background batch operations.
* **Preferred Premium Model (`gemini-3.7-flash`)**:
  - Reserved for high-value reasoning: institutional acquisitions strategy, complex underwriting thesis synthesis, difficult property modeling, multimodal analysis, and optional second-pass **"Professional Review"**.
* **Intermediate Models (`gemini-3.6-flash` / `gemini-3.5-flash`)**:
  - Intermediate quality options and step-down fallbacks.

---

### 1.3 Quota Protection & Single-Turn Batch Generation
To protect the scarce 20-RPD allowances on premium models and optimize the 500-RPD default tier:
1. **Single-Request Full Marketing Kit**:
   - The "Generate Full Marketing Kit" workflow executes **1 single structured JSON request** returning strategy, hooks, headlines, CTAs, Facebook post, Instagram caption, LinkedIn memo, Email newsletter, and 60s video script.
   - Eliminates 5–8 individual API roundtrips.
2. **On-Demand Premium Review**:
   - Deep QA and legal compliance review using `gemini-3.7-flash` is triggered on-demand via the "Professional Review" button rather than automatically on every draft.
3. **Deterministic Layout Isolation**:
   - Zero AI calls are made on React component re-renders. Graphic layouts render deterministically via pure React/SVG.

---

## 2. Visual Asset & Image Providers

Image generation is a **strictly decoupled concern** from marketing intelligence. Creative briefs are compiled into a provider-independent `ImageCreativeBrief` interface and routed to either free development or optional paid premium providers.

```
Campaign Source Data + Brand Kit
              ↓
  CreativeBriefComposer
              ↓
      ImageCreativeBrief
              ↓
     ImageProviderRouter
     ┌────────┴────────┐
     ▼                 ▼
FREE PROVIDERS     PAID PROVIDERS (Optional)
• Real Uploads     • Black Forest Labs (FLUX.2 Pro / Max / Flex)
• NVIDIA NIM       • Google Gemini (Nano Banana Pro)
• Stock Fixtures   • OpenAI Image (Future Adapter)
```

---

### 2.1 Free Providers (Development & Routine Concepts)

#### 1. Authentic Photography (Upload-Only)
* **Purpose:** Primary representation of actual listing condition, physical renovations, and factual deal materials.
* **Implementation Status:** `LIVE` (Production Standard)
* **Models:** `authentic-real-upload`, `curated-stock-fixture`
* **Current Default:** **Priority 1 Default for Real Deals**
* **API Adapter Location:** `src/services/providers/imageProvider.ts` (`UploadOnlyProvider`)
* **Required Secret:** None (Uses Supabase Storage `property-media` bucket)
* **Editing Support:** Manual crop, zoom, focal point adjust
* **Multiple-Reference Support:** Yes (up to 20 uploaded photos)
* **Cost Assumptions:** $0.00
* **Resolution Support:** Original camera resolution up to 4K+
* **Known Limitations:** Requires real photographer / user uploads.
* **Fallback Behavior:** Curated architectural stock fixture.

#### 2. NVIDIA NIM Visual Engine
* **Purpose:** Free development visual concepts, neighborhood aerials, background textures, and preliminary prototypes.
* **Implementation Status:** `LIVE` (Development Standard)
* **Models:** `stabilityai/sdxl-turbo`, `black-forest-labs/flux-1-schnell`, `stabilityai/stable-diffusion-3-medium`
* **Current Default:** `stabilityai/sdxl-turbo`
* **API Adapter Location:** `src/services/providers/nvidiaImageProvider.ts`
* **Required Secret:** `NVIDIA_API_KEY` (Server-side Edge Function or local settings)
* **Editing Support:** Prompt-based regeneration
* **Multiple-Reference Support:** No (text-to-image only)
* **Cost Assumptions:** $0.00 (Hosted free development tier)
* **Resolution Support:** 1024×1024, 896×1120, 1344×768, 768×1344
* **Known Limitations:** Lower fine-grained architectural control; no direct reference conditioning.
* **Fallback Behavior:** Curated architectural stock fixture.

---

### 2.2 Paid Providers (Optional Maximum Quality & Production Standard)

#### 1. Black Forest Labs (FLUX.2)
* **Purpose:** Premier photorealistic marketing hero assets, multi-reference architectural styling, and high-volume production social visuals.
* **Implementation Status:** `LIVE` (Configurable / Opt-In)
* **Models:**
  * **`flux-2-max`** (Paid Maximum Quality): Flagship photorealism, fine architectural lighting, luxury finish precision.
  * **`flux-2-pro`** (Paid Standard): Production social imagery, editorial concepts, multi-reference styling.
  * **`flux-2-flex`** (Paid Specialized): Fine control over spatial composition and subtle typography inside imagery.
* **Current Default:** `flux-2-max` for Hero visuals; `flux-2-pro` for supporting visuals.
* **API Adapter Location:** `src/services/providers/bflImageProvider.ts`
* **Required Secret:** `BFL_API_KEY` (Server-side Edge Function `generate-image` or local setting)
* **Editing Support:** Image-to-image with `image_prompt_strength` (0.35 default for style transfer)
* **Multiple-Reference Support:** Yes (Reference images passed via `image_prompt`)
* **Cost Assumptions:**
  * `flux-2-pro`: ~$0.05 / image
  * `flux-2-max`: ~$0.08 / image
  * `flux-2-flex`: ~$0.06 / image
* **Resolution Support:** 1024×1024 (1:1), 896×1120 (4:5), 1344×768 (16:9), 768×1344 (9:16)
* **Known Limitations:** Incurs API cost; requires deliberate workspace enablement.
* **Fallback Behavior:** If unconfigured or budget exceeded $\to$ NVIDIA NIM or curated stock fixture (never spends money silently).

#### 2. Google Gemini Image Engine (Nano Banana Pro / Imagen 3)
* **Purpose:** Multimodal visual generation with brand asset grounding and creative adjustments.
* **Implementation Status:** `LIVE` (Configurable / Opt-In)
* **Models:** `nano-banana-pro`, `nano-banana-2`, `imagen-3.0-generate-002`
* **Current Default:** `nano-banana-pro`
* **API Adapter Location:** `src/services/providers/geminiImageProvider.ts`
* **Required Secret:** `GEMINI_API_KEY`
* **Editing Support:** Multimodal prompt editing
* **Multiple-Reference Support:** Yes
* **Cost Assumptions:** ~$0.04 / image
* **Resolution Support:** 1024×1024, 1280×720
* **Known Limitations:** Free project tier observed 0 RPD for Nano Banana; treated as paid.
* **Fallback Behavior:** Curated stock fixture.

#### 3. OpenAI Image Engine (Future Adapter)
* **Purpose:** Future enterprise OpenAI image generation.
* **Implementation Status:** `ADAPTER READY` (Inactive by default)
* **Models:** `gpt-image-2`, `dall-e-3`
* **Current Default:** `gpt-image-2`
* **API Adapter Location:** `src/services/providers/openaiImageProvider.ts`
* **Required Secret:** `OPENAI_API_KEY`
* **Editing Support:** Inpainting / variation
* **Cost Assumptions:** ~$0.06 / image
* **Fallback Behavior:** Curated stock fixture.

---

### 2.3 Deliberate Cost Safety & Workspace Spending Controls
* **Deliberate Enablement:** Paid image generation is **OFF by default** (`enablePaidGeneration: false`).
* **No Silent Upgrades:** The application will **never** silently switch from Free to Paid when a free provider fails.
* **Workspace Spending Limits (`src/services/providers/imageSpendingTracker.ts`):**
  * `maxImagesPerCampaign`: Limits generated images per deal (default: 5).
  * `dailySpendingLimitUsd`: Max USD spend per day (default: $5.00).
  * `monthlySpendingLimitUsd`: Max USD spend per month (default: $50.00).
* **Pre-Generation Cost Estimate:** UI displays estimated cost (e.g. `Est. ~$0.08`) before generation.
* **Cost Metadata:** Every generated image records `estimatedCostUsd`, `provider`, `model`, and `timestamp`.

---

### 2.4 Strict Separation: Visual Asset vs. Graphic Design Engine
* **AI image generators produce visual imagery only.**
* Image generators **never** generate marketing flyers or typography containing text.
* The deterministic React/SVG layout engine (`src/components/designs/`), typography pairs, and Brand Kit assemble the finished marketing designs.

---

## 3. Test Suite & Verification Results

All tests run via Vitest:

```bash
npm.cmd test
```

### Verified Test Results:
* `src/tests/modelRegistry.test.ts`: **8 tests passing** (Gemini 3.5 Flash Lite 500 RPD default, 3.1 Flash Lite 500 RPD fallback, 3.7 Flash 20 RPD premium, operation overrides, fallback chains).
* `src/tests/imageProviderRegistry.test.ts`: **6 tests passing** (BFL FLUX.2 Pro/Max/Flex catalog, Gemini Nano Banana Pro, NVIDIA free tier, auto routing, creative brief composition).
* `src/tests/imageCostSafety.test.ts`: **6 tests passing** (deliberate paid enablement, daily/monthly spending limit blockers, campaign image caps, unconfigured key fallbacks).
* `src/tests/quotaAndFallback.test.ts`: **10 tests passing** (error classification, 429 quota routing, mock fallback, usage tracking, single-turn batch generation, image fallbacks).
* `src/tests/antiSlopCritic.test.ts`: **5 tests passing** (slop pattern detection, regulatory claims, brand forbidden words, auto-cleaning, scoring).
* `src/tests/strategyEngine.test.ts`: **2 tests passing** (strategy generation schema, multi-platform copy generation).
* `src/tests/designLayoutStress.test.ts`: **7 tests passing** (currency formatting, number/percentage formatting, fix-and-flip metrics, multi-family metrics, zero-metric edge case, format dimensions, template families).
* `src/tests/supabaseDataMapping.test.ts`: **4 tests passing** (project URL verification, multi-tenant storage path formatting, brand kit JSONB serialization, campaign row serialization).
* **Total: 48 / 48 tests passing (100%).**

---

## 4. Quickstart & Local Execution

1. Clone or open the repository:
   ```bash
   cd ZawMarketing
   ```
2. Install dependencies:
   ```bash
   npm.cmd install
   ```
3. Run test suite:
   ```bash
   npm.cmd test
   ```
4. Build for production:
   ```bash
   npm.cmd run build
   ```
5. Start local development server:
   ```bash
   npm.cmd run dev
   ```
