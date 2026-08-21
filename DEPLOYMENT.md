# Deployment Guide: New Supabase Project & Render Static Site

This guide provides step-by-step instructions to deploy **Zaw Marketing Studio** to a fresh **Supabase** backend and a new **Render Static Site**.

---

## Architecture Overview

- **Frontend**: Vite + React SPA hosted as a **Render Static Site**.
- **Database & Auth**: PostgreSQL on **Supabase** with multi-tenant Row Level Security (RLS).
- **Storage**: 4 private Supabase Storage buckets (`brand-assets`, `property-media`, `campaign-assets`, `campaign-exports`).
- **AI Backend**: **Supabase Edge Functions** for Gemini generation, prompt composition, critique, presentation decks, and optional image generation providers.
- **Review Portal**: Server-side hashed public tokens for review & approval workflows.

---

## Prerequisites

1. [Supabase Account](https://supabase.com)
2. [Render Account](https://render.com)
3. [Gemini API Key](https://aistudio.google.com/) (Required for strategy & copy generation)
4. (Optional) [BFL](https://blackforestlabs.ai/) or [NVIDIA](https://build.nvidia.com/) API Keys for external image generation models
5. [Supabase CLI](https://supabase.com/docs/guides/cli) installed locally (`npm install -g supabase` or `brew install supabase/tap/supabase`)

---

## Part 1: Supabase Backend Setup

### Step 1.1 — Create Supabase Project
1. Log in to [Supabase Dashboard](https://supabase.com/dashboard) and click **New Project**.
2. Set a **Project Name** (e.g. `zaw-marketing-production`), set a secure **Database Password**, and select your preferred **Region**.
3. Once provisioned, navigate to **Project Settings > API** and copy:
   - **Project URL** (e.g., `https://abcdefghijklmnopqrst.supabase.co`)
   - **anon / public key** (`eyJhbGciOi...`)
   - **service_role key** (keep secret, needed only if running automated backend tasks)
   - **Reference ID** (from the URL or General settings, e.g. `abcdefghijklmnopqrst`)

---

### Step 1.2 — Apply Schema & Storage Policies
You have two options to apply the complete schema:

#### Option A: 1-Click SQL Editor (Recommended)
1. In your Supabase dashboard, go to the **SQL Editor** tab.
2. Open the file [`supabase/complete_setup.sql`](./supabase/complete_setup.sql) from this repository.
3. Paste the entire content into the SQL Editor and click **Run**.
4. This will create:
   - All core tables (`organizations`, `organization_members`, `profiles`, `brand_kits`, `campaigns`, `campaign_content`, `campaign_assets`, `design_exports`, `leads`, `lead_lists`, `ai_provider_settings`, `ai_generation_usage`, `ai_generation_logs`, `campaign_review_links`, `campaign_review_versions`, `campaign_review_feedback`).
   - All deterministic RLS policies and multi-tenant triggers.
   - All 4 private storage buckets with tenant path validation (`brand-assets`, `property-media`, `campaign-assets`, `campaign-exports`).
   - Hardened Security Definer RPCs for review portals and AI budget tracking.

#### Option B: Supabase CLI
If using the Supabase CLI locally:
```bash
# Link your local directory to your new Supabase project
supabase link --project-ref <your-project-ref>

# Push all sequential migrations in supabase/migrations/
supabase db push
```

---

### Step 1.3 — Deploy Supabase Edge Functions
The AI features (strategy, copy, presentation decks, critiques, and image generation) run on Supabase Edge Functions located in `supabase/functions/`.

1. Authenticate the CLI with your Supabase account:
```bash
supabase login
```

2. Set the required AI API secrets in your project:
```bash
supabase secrets set GEMINI_API_KEY="your-gemini-api-key-here" --project-ref <your-project-ref>

# Optional keys if enabling external third-party image generation:
supabase secrets set BFL_API_KEY="your-bfl-api-key-here" --project-ref <your-project-ref>
supabase secrets set NVIDIA_API_KEY="your-nvidia-api-key-here" --project-ref <your-project-ref>
```

3. Deploy all edge functions:
```bash
supabase functions deploy generate-campaign-strategy --project-ref <your-project-ref>
supabase functions deploy generate-copy --project-ref <your-project-ref>
supabase functions deploy generate-presentation --project-ref <your-project-ref>
supabase functions deploy critique-copy --project-ref <your-project-ref>
supabase functions deploy generate-image --project-ref <your-project-ref>
supabase functions deploy health --project-ref <your-project-ref>
```

---

### Step 1.4 — Configure Supabase Authentication
1. In Supabase Dashboard, go to **Authentication > URL Configuration**.
2. Set **Site URL** to your Render URL (or temporary `http://localhost:3000` until Render URL is created, then update it):
   - Example: `https://zaw-marketing.onrender.com`
3. Under **Redirect URLs**, add:
   - `https://zaw-marketing.onrender.com/**`
   - `http://localhost:3000/**`

---

## Part 2: Render Static Site Deployment

### Step 2.1 — Create Static Site on Render
1. Log in to [Render Dashboard](https://dashboard.render.com/) and click **New + > Static Site**.
2. Connect your Git repository.
3. Configure the build parameters:
   - **Name**: `zaw-marketing-studio`
   - **Branch**: `main` (or your default branch)
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`

---

### Step 2.2 — Set Environment Variables in Render
Under **Environment Variables**, add:

| Key | Value | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://<your-project-ref>.supabase.co` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` | Your Supabase anonymous public API key |

*(Note: Never set `GEMINI_API_KEY` in Render environment variables; the Gemini key is stored securely inside Supabase Edge Function secrets).*

---

### Step 2.3 — Verify Single-Page Application (SPA) Routing
To ensure routes such as `/review/:token`, direct links, and page reloads work seamlessly without 404s:
- This repository includes `public/_redirects` which instructs Render to route all traffic to `/index.html`:
  ```
  /*    /index.html   200
  ```
- Alternatively, if deploying via Render Blueprints, [`render.yaml`](./render.yaml) is pre-configured with the appropriate rewrite rules and security headers.

---

### Step 2.4 — Trigger Deploy
1. Click **Create Static Site** (or **Manual Deploy > Deploy latest commit**).
2. Render will build the Vite bundle into `dist/` and publish your site.
3. Copy your live Render URL (e.g. `https://zaw-marketing.onrender.com`).
4. Return to **Supabase > Authentication > URL Configuration** and update the **Site URL** with this URL.

---

## Part 3: Verification & Sanity Checklist

Verify the new production deployment with the following steps:

1. **Authentication & Workspace Initialization**:
   - Open your Render static site URL in a browser.
   - Sign up with a new email and password.
   - Verify that your user profile, primary organization workspace, and default brand kit are automatically created via the `handle_new_user()` database trigger.

2. **Campaign Creation & AI Strategy**:
   - Click **Create Campaign** or explore the sample Phoenix fix-and-flip campaign.
   - Run AI Generation for Strategy & Copy.
   - Confirm that requests reach your Supabase Edge Functions and return formatted copy and presentation deck data.

3. **Storage & Assets**:
   - Upload a property photo to a campaign.
   - Confirm that the image loads and is stored under the private `property-media` or `campaign-assets` bucket with organization scoping.

4. **Review Portal Sharing**:
   - In any campaign, click **Share for Review** to generate a public review link.
   - Open the review link in a private/incognito browser window.
   - Verify that the reviewer can browse materials, select preferred variants, submit comments, and approve without requiring an account.
   - Confirm that reviewer feedback synchronizes back to your campaign workspace in real time.

---

## Summary of Environment Configuration

### Client (Render Static Site)
- `VITE_SUPABASE_URL`: Public Supabase endpoint
- `VITE_SUPABASE_ANON_KEY`: Public Supabase anon key

### Serverless Edge Functions (Supabase CLI Secrets)
- `GEMINI_API_KEY`: Google Gemini API key
- `BFL_API_KEY`: *(Optional)* Black Forest Labs API key
- `NVIDIA_API_KEY`: *(Optional)* NVIDIA API key
