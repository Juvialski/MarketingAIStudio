BEGIN;

SELECT plan(13);

INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'tenant-a@example.test', '{}'::jsonb, '{"display_name":"Tenant A","company_name":"Tenant A"}'::jsonb, now(), now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'tenant-b@example.test', '{}'::jsonb, '{"display_name":"Tenant B","company_name":"Tenant B"}'::jsonb, now(), now()),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'tenant-c@example.test', '{}'::jsonb, '{"display_name":"Tenant C","company_name":"Tenant C"}'::jsonb, now(), now());

INSERT INTO public.organizations (id, name, slug)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'Tenant A Test', 'tenant-a-test'),
  ('22222222-2222-4222-8222-222222222222', 'Tenant B Test', 'tenant-b-test');

INSERT INTO public.organization_members (organization_id, user_id, role)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'owner'),
  ('11111111-1111-4111-8111-111111111111', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'admin'),
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'owner');

INSERT INTO public.campaigns (id, organization_id, name, campaign_type, target_market)
VALUES
  ('31111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'A campaign', 'educational', 'A market'),
  ('32222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 'B campaign', 'educational', 'B market');

INSERT INTO public.lead_lists (id, organization_id, name, metro_area, target_category)
VALUES ('41111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'B list', 'B market', 'investors');
INSERT INTO public.leads (id, list_id, organization_id, company_name, category, metro_area, relevance_reason)
VALUES ('42222222-2222-4222-8222-222222222222', '41111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'B lead', 'investor', 'B market', 'fixture');

INSERT INTO storage.objects (bucket_id, name, owner_id)
VALUES ('property-media', '22222222-2222-4222-8222-222222222222/32222222-2222-4222-8222-222222222222/b-object.jpg', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

SELECT is(
  (SELECT count(*) FROM storage.buckets WHERE id IN ('brand-assets', 'property-media', 'campaign-assets', 'campaign-exports') AND public = false),
  4::bigint,
  'all application buckets are private'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

SELECT results_eq(
  $$ SELECT count(*)::bigint FROM public.campaigns WHERE organization_id = '22222222-2222-4222-8222-222222222222' $$,
  ARRAY[0::bigint],
  'tenant A cannot select tenant B campaigns'
);
SELECT results_eq(
  $$ WITH changed AS (UPDATE public.campaigns SET name = 'tampered' WHERE id = '32222222-2222-4222-8222-222222222222' RETURNING id) SELECT count(*)::bigint FROM changed $$,
  ARRAY[0::bigint],
  'tenant A cannot update tenant B campaigns'
);
SELECT results_eq(
  $$ WITH removed AS (DELETE FROM public.campaigns WHERE id = '32222222-2222-4222-8222-222222222222' RETURNING id) SELECT count(*)::bigint FROM removed $$,
  ARRAY[0::bigint],
  'tenant A cannot delete tenant B campaigns'
);
SELECT results_eq(
  $$ SELECT count(*)::bigint FROM public.leads WHERE organization_id = '22222222-2222-4222-8222-222222222222' $$,
  ARRAY[0::bigint],
  'tenant A cannot select tenant B leads'
);
SELECT throws_ok(
  $$ INSERT INTO public.campaign_content (campaign_id, organization_id, content_type) VALUES ('32222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'strategy') $$,
  '23514',
  'campaign_content organization does not match campaign',
  'cross-tenant campaign content is rejected'
);
SELECT throws_ok(
  $$ INSERT INTO public.campaign_assets (campaign_id, organization_id, storage_path, public_url) VALUES ('32222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'x.jpg', NULL) $$,
  '23514',
  'campaign_assets organization does not match campaign',
  'cross-tenant campaign assets are rejected'
);
SELECT lives_ok(
  $$ INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES ('property-media', '11111111-1111-4111-8111-111111111111/31111111-1111-4111-8111-111111111111/a-object.jpg', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') $$,
  'tenant A can upload inside its organization prefix'
);
SELECT throws_ok(
  $$ INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES ('property-media', '22222222-2222-4222-8222-222222222222/32222222-2222-4222-8222-222222222222/a-intrusion.jpg', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') $$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'tenant A cannot upload into tenant B prefix'
);
SELECT results_eq(
  $$ SELECT count(*)::bigint FROM storage.objects WHERE name LIKE '22222222-2222-4222-8222-222222222222/%' $$,
  ARRAY[0::bigint],
  'tenant A cannot read tenant B objects'
);
SELECT results_eq(
  $$ WITH changed AS (UPDATE storage.objects SET metadata = '{"tampered":true}'::jsonb WHERE name LIKE '22222222-2222-4222-8222-222222222222/%' RETURNING id) SELECT count(*)::bigint FROM changed $$,
  ARRAY[0::bigint],
  'tenant A cannot overwrite tenant B objects'
);
SELECT throws_ok(
  $$ SELECT public.set_organization_member_role('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'member') $$,
  '23514',
  'the organization must retain an owner',
  'the last owner cannot demote themselves'
);

SELECT set_config('request.jwt.claim.sub', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', true);
SELECT throws_ok(
  $$ SELECT public.set_organization_member_role('11111111-1111-4111-8111-111111111111', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'owner') $$,
  '42501',
  'only an owner may manage owner roles',
  'an admin cannot promote themselves to owner'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
