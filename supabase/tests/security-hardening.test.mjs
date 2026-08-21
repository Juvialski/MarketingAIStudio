import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFile(join(root, relative), 'utf8');

test('forward migration makes Storage private and organization-prefixed', async () => {
  const sql = await read('migrations/20260820110000_production_hardening.sql');
  assert.match(sql, /UPDATE storage\.buckets[\s\S]*SET public = false/);
  assert.match(sql, /storage_object_org_id/);
  assert.match(sql, /Org members can read private campaign-assets/);
  assert.match(sql, /WITH CHECK \(bucket_id = 'campaign-assets'[\s\S]*is_org_member/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.is_org_member\(UUID\)/);
});

test('forward migration binds tenant children and owner role changes', async () => {
  const sql = await read('migrations/20260820110000_production_hardening.sql');
  assert.match(sql, /campaign_content organization does not match campaign/);
  assert.match(sql, /campaign_assets organization does not match campaign/);
  assert.match(sql, /brand_kit_id must belong to the campaign organization/);
  assert.match(sql, /the organization must retain an owner/);
  assert.match(sql, /self-promotion to owner is not allowed/);
  assert.match(sql, /claim_ai_generation/);
  assert.match(sql, /UNIQUE \(organization_id, idempotency_key\)/);
});

test('Edge Functions share auth, schema validation and sanitized errors', async () => {
  for (const name of ['critique-copy', 'extract-property-data', 'generate-campaign-strategy', 'generate-copy', 'generate-image', 'generate-presentation', 'health']) {
    const source = await read(`functions/${name}/index.ts`);
    assert.match(source, /authenticate/);
    assert.match(source, /assertOrganizationAccess/);
    assert.match(source, /parseBody/);
    assert.match(source, /errorResponse/);
    assert.doesNotMatch(source, /JSON\.stringify\(\{ error: err\.message \}\)/);
  }
});

test('health reports safe server capability only', async () => {
  const source = await read('functions/health/index.ts');
  assert.match(source, /paidGenerationEnabled/);
  assert.match(source, /configured\('GEMINI_API_KEY'\)/);
  assert.doesNotMatch(source, /JSON\.stringify\(.*API_KEY/);
  assert.doesNotMatch(source, /provider.*error body/i);
});

test('image generation does not return provider URLs or use retired contracts', async () => {
  const source = await read('functions/generate-image/index.ts');
  const image = await read('functions/_shared/image.ts');
  assert.match(image, /https:\/\/api\.bfl\.ai\/v1/);
  assert.match(image, /polling_url/);
  assert.match(image, /persistGeneratedImage/);
  assert.doesNotMatch(source, /api\.bfl\.ml/);
  assert.doesNotMatch(source, /sdxl-turbo/);
  assert.doesNotMatch(source, /imagen-3\.0/);
  assert.doesNotMatch(source, /url:\s*imageUrl/);
});

test('Gemini request uses structured output and supported thinking levels', async () => {
  const source = await read('functions/_shared/gemini.ts');
  assert.match(source, /responseJsonSchema/);
  assert.match(source, /thinkingConfig/);
  assert.doesNotMatch(source, /temperature/);
  assert.doesNotMatch(source, /top_p|top_k/);
});

test('review feedback migration validates keys against published snapshot', async () => {
  const sql = await read('migrations/20260821120000_feedback_snapshot_validation.sql');
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.submit_public_review_feedback/);
  assert.match(sql, /published_snapshot/);
  assert.match(sql, /campaign_overall/);
  assert.match(sql, /graphicMaterials/);
  assert.match(sql, /copyChannels/);
  assert.match(sql, /Variants are not supported for presentation material/);
  assert.match(sql, /Specified variant does not exist for this material/);
  assert.match(sql, /Material key does not exist in the published review package/);
});

test('hardening migration 20260821110000 explicitly drops legacy RPC signatures before recreating them', async () => {
  const hardeningSql = await read('migrations/20260821110000_review_portal_hardening.sql');
  // 1. Confirms legacy (TEXT, TEXT) overload is explicitly dropped
  assert.match(hardeningSql, /DROP FUNCTION IF EXISTS public\.get_public_review_snapshot\(\s*TEXT,\s*TEXT\s*\);/);
  // 2. Confirms legacy feedback RPC is dropped before parameter rename to p_raw_token
  assert.match(hardeningSql, /DROP FUNCTION IF EXISTS public\.submit_public_review_feedback\(\s*TEXT,\s*TEXT,\s*TEXT,\s*TEXT,\s*TEXT,\s*TEXT\s*\);/);
  // 3. Confirms legacy approval RPC is dropped before parameter rename to p_raw_token
  assert.match(hardeningSql, /DROP FUNCTION IF EXISTS public\.submit_public_campaign_approval\(\s*TEXT,\s*TEXT,\s*TEXT,\s*TEXT\s*\);/);
  // 4. Confirms recreate with p_raw_token and server-side hashing
  assert.match(hardeningSql, /CREATE OR REPLACE FUNCTION public\.get_public_review_snapshot\(\s*p_raw_token TEXT\s*\)/);
  assert.match(hardeningSql, /encode\(digest\(TRIM\(p_raw_token\), 'sha256'\), 'hex'\)/);
});

test('forward migration 20260821130000 idempotently drops legacy review RPC overload and hardens feedback integrity', async () => {
  const sql = await read('migrations/20260821130000_remove_legacy_review_rpc.sql');
  // 1. Confirms legacy (TEXT, TEXT) overload is idempotently dropped
  assert.match(sql, /DROP FUNCTION IF EXISTS public\.get_public_review_snapshot\(TEXT, TEXT\);/);

  // 2. Confirms graphic preferred status requires valid variant key
  assert.match(sql, /Preferred status for graphic materials requires a valid variant key/);

  // 3. Confirms reviewer name normalization
  assert.match(sql, /NULLIF\(TRIM\(p_reviewer_name\), ''\), 'Reviewer'/);

  // 4. Confirms grants and role restrictions on single raw-token review snapshot RPC
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.get_public_review_snapshot\(TEXT\) FROM PUBLIC;/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.get_public_review_snapshot\(TEXT\) TO anon, authenticated, service_role;/);
});

test('config.toml configures get-public-review with verify_jwt = false for anonymous access', async () => {
  const config = await read('config.toml');
  assert.match(config, /\[functions\.get-public-review\]/);
  assert.match(config, /\[functions\.get-public-review\]\s*\n\s*verify_jwt\s*=\s*false/);
});

test('hotfix migration 20260821150000 schema-qualifies extensions.digest and hardens search path', async () => {
  const sql = await read('migrations/20260821150000_fix_public_review_pgcrypto.sql');
  // 1. Schema setup & extension placement
  assert.match(sql, /CREATE SCHEMA IF NOT EXISTS extensions;/);
  assert.match(sql, /CREATE EXTENSION pgcrypto WITH SCHEMA extensions;/);

  // 2. Search path hardening to public, extensions, pg_temp
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.get_public_review_snapshot[\s\S]*SET search_path = public, extensions, pg_temp/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.submit_public_review_feedback[\s\S]*SET search_path = public, extensions, pg_temp/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.submit_public_campaign_approval[\s\S]*SET search_path = public, extensions, pg_temp/);

  // 3. Schema-qualified pgcrypto digest call
  assert.match(sql, /extensions\.digest\(TRIM\(p_raw_token\)::text,\s*'sha256'::text\)/);

  // 4. Role grants
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.get_public_review_snapshot\(TEXT\) TO anon, authenticated, service_role;/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.submit_public_review_feedback\(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT\) TO anon, authenticated, service_role;/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.submit_public_campaign_approval\(TEXT, TEXT, TEXT, TEXT\) TO anon, authenticated, service_role;/);
});

test('full PostgreSQL migration replay from zero creates hardened RPCs and verifies token hashing execution', async () => {
  const db = new PGlite({
    extensions: { pgcrypto, uuid_ossp }
  });

  // Supabase bootstrap setup
  await db.exec(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role;
      END IF;
    END
    $$;

    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE SCHEMA IF NOT EXISTS storage;

    CREATE TABLE IF NOT EXISTS auth.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT,
      raw_app_meta_data JSONB DEFAULT '{}'::jsonb,
      raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
      SELECT COALESCE(
        NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid,
        '00000000-0000-0000-0000-000000000000'::uuid
      );
    $$ LANGUAGE sql STABLE;

    CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT AS $$
      SELECT COALESCE(
        NULLIF(current_setting('request.jwt.claim.role', true), ''),
        'anon'
      );
    $$ LANGUAGE sql STABLE;

    CREATE TABLE IF NOT EXISTS storage.buckets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner UUID REFERENCES auth.users(id),
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      public BOOLEAN DEFAULT false,
      avif_autodetection BOOLEAN DEFAULT false,
      file_size_limit BIGINT,
      allowed_mime_types TEXT[],
      owner_id TEXT
    );

    CREATE TABLE IF NOT EXISTS storage.objects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bucket_id TEXT REFERENCES storage.buckets(id),
      name TEXT,
      owner UUID REFERENCES auth.users(id),
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      last_accessed_at TIMESTAMPTZ DEFAULT now(),
      metadata JSONB DEFAULT '{}'::jsonb,
      path_tokens TEXT[] GENERATED ALWAYS AS (string_to_array(name, '/')) STORED,
      version TEXT,
      owner_id TEXT
    );
  `);

  const migrationsDir = join(root, 'migrations');
  const files = (await readdir(migrationsDir)).filter(f => f.endsWith('.sql')).sort();

  assert.ok(files.length >= 10, 'Expected at least 10 migrations');

  for (const file of files) {
    const migrationSql = await readFile(join(migrationsDir, file), 'utf8');
    await db.exec(migrationSql);
  }

  // Verify functions in pg_proc catalog
  const rpcQuery = await db.query(`
    SELECT 
      p.proname,
      pg_get_function_identity_arguments(p.oid) as identity_args,
      pg_get_function_arguments(p.oid) as full_args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'get_public_review_snapshot',
        'submit_public_review_feedback',
        'submit_public_campaign_approval',
        'create_campaign_review_link_atomic',
        'publish_campaign_review_version_atomic'
      )
    ORDER BY p.proname;
  `);

  const procs = rpcQuery.rows;

  // 1. Verify get_public_review_snapshot
  const snapshotProcs = procs.filter(p => p.proname === 'get_public_review_snapshot');
  assert.equal(snapshotProcs.length, 1, 'get_public_review_snapshot must have exactly 1 signature (no legacy overloads)');
  assert.equal(snapshotProcs[0].identity_args, 'p_raw_token text');

  // 2. Verify submit_public_review_feedback
  const feedbackProcs = procs.filter(p => p.proname === 'submit_public_review_feedback');
  assert.equal(feedbackProcs.length, 1, 'submit_public_review_feedback must have exactly 1 signature');
  assert.match(feedbackProcs[0].full_args, /^p_raw_token text,/);

  // 3. Verify submit_public_campaign_approval
  const approvalProcs = procs.filter(p => p.proname === 'submit_public_campaign_approval');
  assert.equal(approvalProcs.length, 1, 'submit_public_campaign_approval must have exactly 1 signature');
  assert.match(approvalProcs[0].full_args, /^p_raw_token text,/);

  // 4. Verify owner atomic RPCs exist
  const createLinkProcs = procs.filter(p => p.proname === 'create_campaign_review_link_atomic');
  assert.equal(createLinkProcs.length, 1);
  const publishVersionProcs = procs.filter(p => p.proname === 'publish_campaign_review_version_atomic');
  assert.equal(publishVersionProcs.length, 1);

  // 5. Functional SQL Verification: Test actual RPC hashing execution with sample data
  const rawToken = 'rev_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  // Compute expected SHA-256 hash using crypto
  const { createHash } = await import('node:crypto');
  const expectedHash = createHash('sha256').update(rawToken).digest('hex');

  // Create sample user, org and campaign
  const userId = 'a0000000-0000-0000-0000-000000000001';
  await db.query(`
    INSERT INTO auth.users (id, email)
    VALUES ($1::uuid, 'sarah@acmecap.com');
  `, [userId]);

  const orgResult = await db.query(`
    INSERT INTO public.organizations (name, slug)
    VALUES ('Acme Capital', 'acme-cap')
    RETURNING id;
  `);
  const orgId = orgResult.rows[0].id;

  await db.query(`
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES ($1::uuid, $2::uuid, 'owner');
  `, [orgId, userId]);

  // Set auth context
  await db.exec(`
    SET request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';
    SET request.jwt.claim.role = 'authenticated';
  `);

  const campaignResult = await db.query(`
    INSERT INTO public.campaigns (organization_id, name, status, source_data)
    VALUES ($1, 'Phoenix Multifamily', 'completed', '{"title":"Phoenix Multifamily"}'::jsonb)
    RETURNING id;
  `, [orgId]);
  const campaignId = campaignResult.rows[0].id;

  // Atomically create review link with snapshot
  const sampleSnapshot = {
    campaignId,
    campaignTitle: 'Phoenix Multifamily',
    campaignType: 'value_add',
    targetMarket: 'Phoenix, AZ',
    graphicMaterials: [
      {
        id: 'graphic_square',
        label: 'Square Post',
        format: 'square',
        dimensions: { width: 1080, height: 1080 },
        variants: [{ id: 'editorial', name: 'Editorial Style', config: {} }]
      }
    ],
    copyChannels: [
      { id: 'copy_facebook', channelName: 'Facebook', headline: 'Great Deal', body: 'Invest now', cta: 'Learn More' }
    ]
  };

  await db.query(`
    SELECT public.create_campaign_review_link_atomic(
      $1::uuid,
      $2::uuid,
      $3::text,
      $4::jsonb,
      '{"allowComments":true,"allowSelection":true,"allowApproval":true}'::jsonb
    );
  `, [orgId, campaignId, expectedHash, JSON.stringify(sampleSnapshot)]);

  // Test 5A: get_public_review_snapshot with raw token
  const snapshotRes = await db.query(`
    SELECT public.get_public_review_snapshot($1::text) AS result;
  `, [rawToken]);
  const snapshotData = snapshotRes.rows[0].result;
  assert.equal(snapshotData.status, 'active');
  assert.equal(snapshotData.version_number, 1);
  assert.equal(snapshotData.snapshot.campaignTitle, 'Phoenix Multifamily');

  // Test 5B: get_public_review_snapshot with invalid raw token
  const invalidRes = await db.query(`
    SELECT public.get_public_review_snapshot('rev_non_existent_token_12345') AS result;
  `);
  assert.equal(invalidRes.rows[0].result.status, 'not_found');

  // Test 5C: submit_public_review_feedback with valid raw token
  const feedbackRes = await db.query(`
    SELECT public.submit_public_review_feedback(
      $1::text,
      'graphic_square'::text,
      'editorial'::text,
      'preferred'::text,
      'Looks great for social.'::text,
      'Sarah Reviewer'::text
    ) AS result;
  `, [rawToken]);
  const feedbackData = feedbackRes.rows[0].result;
  assert.equal(feedbackData.success, true);
  assert.equal(feedbackData.feedback.reviewer_name, 'Sarah Reviewer');
  assert.equal(feedbackData.feedback.status, 'preferred');

  // Test 5D: submit_public_campaign_approval with valid raw token
  const approvalRes = await db.query(`
    SELECT public.submit_public_campaign_approval(
      $1::text,
      'approved'::text,
      'Executive sign-off confirmed.'::text,
      'General Partner'::text
    ) AS result;
  `, [rawToken]);
  const approvalData = approvalRes.rows[0].result;
  assert.equal(approvalData.success, true);
  assert.equal(approvalData.status, 'approved');
});



