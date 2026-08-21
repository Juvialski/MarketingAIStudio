# Zaw Marketing Studio — Real Estate Marketing & Business Automation

A production-quality web application and marketing automation studio built for real estate investment firms, acquisitions teams, and private capital operators.

---

## Key Capabilities

* **Deterministic Graphic Rendering Engine:** Pixel-perfect rendering of social graphics (1:1 Square, 4:5 Portrait, 9:16 Story/Reel, 1.91:1 Landscape) and printable 300 DPI investment flyers (US Letter & A4). Live vector typography is never baked into AI images.
* **5 Distinct Design Families:** Editorial Real Estate, Institutional Investment, Modern Brokerage, Direct Response Investor, and Market Intelligence.
* **Anti-Slop Copy Quality Critic:** Rule engine that detects and automatically removes AI clichés, fake urgency, and unverified ROI claims.
* **Multi-Platform Copywriter:** Tailored copy generation for LinkedIn (institutional brief), Instagram (caption + hashtags), Facebook, Email Newsletters, and 60-second video reel scripts.
* **1-Click Full Marketing Kit (.ZIP):** Bundles strategy markdown, copy markdown, video script, rendered PNG graphics, and the printable PDF flyer into a single download.
* **Global Brand Kit:** Real-time brand inheritance for company logos, typography pairings, color palettes, tone of voice, and required legal compliance disclaimers.
* **Public Investor Lead Finder:** Research tool for finding active real estate investment companies and generating tailored outreach hooks.
* **Pluggable AI Architecture:** Supports live Google Gemini (`gemini-3.7-flash` via `@google/genai`) or runs in zero-key high-fidelity mock mode out of the box.

---

## Tech Stack

* **Frontend:** React 18, TypeScript (Strict), Vite, Tailwind CSS, Lucide Icons
* **Graphics & Export:** `html-to-image`, `jspdf`, `jszip`, `file-saver`
* **AI Provider:** Google Gemini API (`@google/genai`), Pluggable Mock Fallback
* **Testing:** Vitest, Testing Library

---

## Quickstart

### 1. Install dependencies:
```bash
npm.cmd install
```

### 2. Start the development server:
```bash
npm.cmd run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Run automated tests:
```bash
npm.cmd test
```

### 4. Build for production:
```bash
npm.cmd run build
```

---

## Configuration

Copy `.env.example` to `.env`:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_GEMINI_MODEL=gemini-3.7-flash
VITE_GEMINI_IMAGE_MODEL=gemini-3.1-flash-image-preview
```
*Note: If no API key is provided, the studio automatically runs in high-fidelity mock mode with pre-configured sample campaigns.*

---

## Documentation for Next Agent (Codex)

See [`CODEX_HANDOVER.md`](./CODEX_HANDOVER.md) for full architectural specifications, schema references, design system guidelines, and recommended next milestones.
